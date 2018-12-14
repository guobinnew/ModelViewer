<template>
  <div :id="id" class="home" style="position: relative">
    <!--<div class="katex"></div>-->
    <div class="hud"></div>
    <div class="controls"></div>
    <div class="container"></div>

    <el-dialog title="选择部件" :visible.sync="attachTableVisible">
      <el-table :data="attachData" :border="true" align="left">
        <el-table-column property="model.name" label="ID" width="150"></el-table-column>
        <el-table-column property="model.type" label="类型" width="200"></el-table-column>
        <el-table-column property="model.description" label="描述"></el-table-column>
        <el-table-column label="操作" width="100">
          <template slot-scope="scope">
            <el-button
                    size="mini"
                    type="danger"
                    @click="handleInstall(scope.$index, scope.row)">{{ scope.row.installed ? "卸载" : "安装" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
    <el-row class="scenegraph" v-show="hudVisible">
      <h5 class="title">模型装配结构</h5>
      <el-tree ref="scenegraph" :data="scenetreeData" :props="scenetreeProps" node-key="id" highlight-current :expand-on-click-node="false" @node-click="handleSceneGraphClick">
        <span class="custom-tree-node" slot-scope="{ node, data }">
        <span>{{ node.label }}</span>
        <span class="tree-node-btn" @click="() => showInstall(data.model)">
          <i class="el-icon-location"></i>
        </span>
      </span>
      </el-tree>
    </el-row>
  </div>
</template>

<style>
  .home{
    height: 100%;
    overflow: hidden;
  }

  .container {

  }

  .controls {
    position: absolute;
    top: 0;
    right:0;
    overflow: visible;
  }

  .hud {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    overflow: visible !important;
  }

  .title {
    line-height: 40px;
    background-color: white;
  }

  .scenegraph {
    position: absolute;
    top: 32px;
    left: 0;
    min-width: 200px;
    overflow: visible;
  }

  .el-tree-node {
    margin-right: 8px;
  }

  .el-tree--highlight-current .el-tree-node.is-current>.el-tree-node__content {
    background-color: #3a8ee6;
    color: white;
  }
  .custom-tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    padding-right: 8px;
  }

  .tree-node-btn {
    margin-left: 4px;
  }
</style>
<script>
  import $ from 'jquery'
  import * as THREE from 'three'
  import GLTFLoader  from 'three-gltf-loader'
  import OrbitControls from 'three-orbitcontrols'

  import Water from '../components/water'
  import Sky from '../components/sky'
  import Katex from 'katex'
  import * as dat from 'dat.gui'
  import Utils from '../utils'

  var WEBGL = {

    isWebGLAvailable: function () {

      try {

        var canvas = document.createElement( 'canvas' );
        return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) );

      } catch ( e ) {

        return false;

      }

    },

    isWebGL2Available: function () {

      try {

        var canvas = document.createElement( 'canvas' );
        return !! ( window.WebGL2RenderingContext && canvas.getContext( 'webgl2' ) );

      } catch ( e ) {

        return false;

      }

    },

    getWebGLErrorMessage: function () {

      return this.getErrorMessage( 1 );

    },

    getWebGL2ErrorMessage: function () {

      return this.getErrorMessage( 2 );

    },

    getErrorMessage: function ( version ) {

      var names = {
        1: 'WebGL',
        2: 'WebGL 2'
      };

      var contexts = {
        1: window.WebGLRenderingContext,
        2: window.WebGL2RenderingContext
      };

      var message = 'Your $0 does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">$1</a>';

      var element = document.createElement( 'div' );
      element.id = 'webglmessage';
      element.style.fontFamily = 'monospace';
      element.style.fontSize = '13px';
      element.style.fontWeight = 'normal';
      element.style.textAlign = 'center';
      element.style.background = '#fff';
      element.style.color = '#000';
      element.style.padding = '1.5em';
      element.style.width = '400px';
      element.style.margin = '5em auto 0';

      if ( contexts[ version ] ) {

        message = message.replace( '$0', 'graphics card' );

      } else {

        message = message.replace( '$0', 'browser' );

      }

      message = message.replace( '$1', names[ version ] );

      element.innerHTML = message;

      return element;

    }

  }
  var nodeId = 1;

export default {
  name: 'home',
  data: function () {
    return {
      id: 'home',
      width: 0,
      height: 0,
      name: '055',
      models: {},
      modelIndex: {},
      modelCategories:{},
      modelTypes: {},
      mouse: null,
      raycaster: null,
      intersect: null,
      current: null,
      hotMat: [],
      model: null,
      attachTableVisible: false,
      attachData: [],
      scene: null,
      hud: null,
      hudVisible: false,
      scenetreeData: [],
      scenetreeProps: {
        children: 'children',
        label: 'name'
      },

      options: {},
      optionCtrls: {
        base: null,
        install: null
      }
    }
  },
  components: {
  },
  methods: {
    handleSceneGraphClick(data) {
      // 选中该模型
      this.selectModel(data.model)
    },
    selectModel(model) {
      if(this.current) {
        this.current.material = this.hotMat[0]
      }

      this.current = model
      if(model) {
        this.options.name = model.name
        this.options.model = model
        this.current.material = this.hotMat[1]
      } else {
        this.options.model = this.model  // 根模型
        this.options.name = this.name
      }

      if (this.optionCtrls.base) {
        this.gui.removeFolder(this.optionCtrls.base)
        this.optionCtrls.base = null
      }
      if (this.options.model) {
        this.optionCtrls.base = this.gui.addFolder('位置')
        this.optionCtrls.base.add(this.options.model.position, {key:'x', title:'X坐标'})
        this.optionCtrls.base.add(this.options.model.position, {key:'y', title:'Y坐标'})
        this.optionCtrls.base.add(this.options.model.position, {key:'z', title:'Z坐标'})
        this.optionCtrls.base.open()
      }

      // 更新
      for (var i in this.gui.__controllers) {
        this.gui.__controllers[i].updateDisplay()
      }

    },
    showInstall(model){
      if(model){
        let name = model.name
        // 查询符合条件的部件
        let def = model.userData.def
        if (def && def.type === "Attach") {
          // 根据类型和类目进行过滤
          let attaches = []
          if (def.categories) {
            for (let c of def.categories) {
              if (this.modelCategories[c] && this.modelCategories[c].length >0) {
                attaches = attaches.concat(this.modelCategories[c])
              }
            }
          }

          if (def.types) {
            if (!def.categories || def.categories.length === 0) {
              for (let t of def.types) {
                if (this.modelTypes[t] && this.modelTypes[t].length > 0) {
                  attaches = attaches.concat(this.modelTypes[t])
                }
              }
            } else {
              // 进行二次过滤
              attaches = attaches.filter((elem) => {
                return def.types.indexOf(elem.type) >= 0
              })
            }
          }

          this.attachData = attaches.map((elem) => {
            return {
              model: elem,
              installed: elem.name === model.userData.name
            }
          })
          this.attachNode = model
          this.attachTableVisible = attaches.length > 0
        }
      }
    },
    handleInstall(index, row) {

      if (row.installed) {
        //卸载模型
        let jpmodel = this.attachNode
        let model = jpmodel.userData.model
        model.visible = false
        jpmodel.parent.remove(model)
        jpmodel.userData.model = null
        jpmodel.userData.name = null

        // 树结构
        let node = this.$refs.scenegraph.getNode(jpmodel.userData.id)
        node.data.children = []

      } else {
        this.loadModel(row)
      }

      this.attachTableVisible = false

    },
    loadModel(def) {

      let that = this
      let f = `models/gltf/${def.model.model}`
      let loader = new GLTFLoader()

      console.log(def)


      loader.load(f, function (jpgltf) {
        let jpmodel = that.attachNode
        let jpnode = that.$refs.scenegraph.getNode(jpmodel.userData.id)

        let install = jpgltf.scene
        let bb = new THREE.Box3().setFromObject( jpmodel )
        install.position.set(jpmodel.position.x, jpmodel.position.y, jpmodel.position.z) //bb.getCenter())//.add(that.model.position)
        install.scale.set(1, 1, 1)

        install.userData.def = def.model
        install.userData.id = nodeId
        // 解析旋转对象
        install.userData.rotatey = []
        install.userData.rotatex = []

        jpnode.data.children.push({
          id: nodeId++,
          name: def.model.name,
          model: install,
          children: []  // 加载内部挂点
        })

        install.traverse(function (child) {
          console.log(child.name)
          if (child.isMesh && child.name) {
            if (child.name.endsWith('_rotatey')) {
              install.userData.rotatey.push({offset: child.rotation.y, model: child})
            } else if (child.name.endsWith('_rotatex')) {
              install.userData.rotatex.push({offset: child.rotation.x, model: child})
            }
          }
        });
        install.userData.rotate = install.userData.rotatey.length > 0 || install.userData.rotatex.length > 0

        jpmodel.userData.model = install
        jpmodel.userData.name = def.model.name
        jpmodel.parent.add(install)

        console.log('loaded', install)
      }, undefined, function (e) {
        console.error(e)
      })
    }
  },
  mounted: function () {
    var that = this
    var scene, camera, light
    var renderer, controls
    var clock = new THREE.Clock()
    var $container = $(this.$el).find('.container')

    if ( WEBGL.isWebGLAvailable() === false ) {
      $container.append( WEBGL.getWebGLErrorMessage() );
      return
    }

    let $hud = $(this.$el).find('.hud')
    that.hud = Utils.svg.svg()
    $hud.append(that.hud)

    let ws = Utils.svg.elementNS('g', {
      class: 'hudWorkspace'
    })
    that.hud.appendChild(ws)

    let button = Utils.svg.image({
      width: 24,
      height: 24,
      x: 4,
      y: 4,
      url: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gU3ZnIFZlY3RvciBJY29ucyA6IGh0dHA6Ly93d3cuc2ZvbnQuY24gLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwMCAxMDAwIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAxMDAwIDEwMDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPG1ldGFkYXRhPiBTdmcgVmVjdG9yIEljb25zIDogaHR0cDovL3d3dy5zZm9udC5jbiA8L21ldGFkYXRhPg0KPGc+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsNTExLjAwMDAwMCkgc2NhbGUoMC4xMDAwMDAsLTAuMTAwMDAwKSI+PHBhdGggZD0iTTQ1MzcuNyw0OTk3LjNjLTk0Ny4xLTk2LjYtMTg1MS4xLTQ2Mi4zLTI1ODYuNi0xMDQxLjZjLTE4Ny0xNDUuOS02NTEuMy02MTAuMi03OTcuMi03OTcuMkM2MjMuOSwyNDg0LjYsMjcwLjUsMTY2NC45LDEzNyw3ODcuNmMtNDkuMy0zMjYuNy00OS4zLTEwMjkuMywwLTEzNTZjMTMzLjUtODc3LjMsNDg0LjktMTY5NSwxMDE3LTIzNzAuOWMxNTguMi0yMDMuNCw2MzktNjc4LDgzNi4yLTgyOGM3MDYuOC01MzIuMSwxNDYyLjgtODUyLjYsMjMzMS45LTk4Ni4yYzMyNC42LTQ5LjMsMTAyNy4zLTQ5LjMsMTM1NiwwYzg2NC45LDEzMS41LDE2MjMuMSw0NTIsMjMzMS45LDk4Ni4yYzIxMS42LDE2MC4zLDcwNi44LDY1NS40LDg2Nyw4NjdDOTQxMS0yMTkxLjQsOTczMS41LTE0MzMuMyw5ODYzLTU2OC40YzQ5LjMsMzI4LjcsNDkuMywxMDMxLjQsMCwxMzU2Yy0xMzMuNSw4NjkuMS00NTQuMSwxNjI1LjEtOTg2LjIsMjMzMS45Yy0xNTAsMTk3LjItNjI0LjYsNjc4LTgyOCw4MzYuMmMtNjY5LjgsNTI4LTE0OTkuOCw4ODMuNC0yMzUwLjQsMTAxMi45QzU0MzUuNiw1MDA3LjYsNDc5MC40LDUwMjQsNDUzNy43LDQ5OTcuM3ogTTU0MzMuNSw0NDQ0LjZjODM4LjItODQuMiwxNjQ3LjctNDIxLjIsMjMxMS4zLTk1Ny40YzI0MC40LTE5My4xLDU1NC43LTUxOS44LDczOS42LTc2OC40YzE1MDYtMjAxMy40LDEwMDQuNy00ODYxLTExMDEuMi02MjUxLjlDNTY5NC40LTQ2NDYuNiwzNDUwLjktNDQzNywxOTg0LTMwMjUuNmMtMzgyLjEsMzY3LjctNjUzLjMsNzM3LjYtODg3LjUsMTIxNC4yQzEyMC41LDE2MSw3NjkuOCwyNTMxLjksMjYxNi44LDM3NTIuM0MzNDM0LjUsNDI5Mi42LDQ0NTMuNSw0NTQzLjIsNTQzMy41LDQ0NDQuNnoiLz48cGF0aCBkPSJNMzQyMC4xLDEwOTcuOGMtODAuMS04MC4xLTgwLjEtMzk2LjUsMC00NzYuN2MzNy0zNyw4OC4zLTM5LDE1NzkuOS0zOWMxNDkxLjYsMCwxNTQyLjksMi4xLDE1NzkuOSwzOWM4MC4xLDgwLjEsODAuMSwzOTYuNSwwLDQ3Ni43Yy0zNywzNy05NC41LDM5LTE1NzkuOSwzOUMzNTE0LjYsMTEzNi45LDM0NTcuMSwxMTM0LjgsMzQyMC4xLDEwOTcuOHoiLz48cGF0aCBkPSJNMzQzNC41LTQyNi42Yy0xMDIuNy01OS42LTEwMC43LTQ1Ni4xLDQuMS01MTEuNmMyNC43LTEyLjMsNTc3LjMtMjAuNSwxNTY5LjctMjAuNWMxNDgzLjMsMCwxNTM0LjcsMi4xLDE1NzEuNywzOWM4MC4xLDgwLjEsODAuMSwzOTYuNSwwLDQ3Ni43Yy0zNywzNy05NC41LDM5LTE1NzMuOCwzOUM0MDIyLjEtNDA0LDM0NTcuMS00MTIuMiwzNDM0LjUtNDI2LjZ6Ii8+PC9nPjwvZz4NCjwvc3ZnPg==',
    })

    button.setAttributeNS(null, 'data-id', 'scenegraph')
    button.addEventListener('mousedown', function () {
      that.hudVisible = !that.hudVisible
    })
    ws.appendChild(button)

    var resizeCanvas = function () {
      let $main = $('.el-main')
      that.width = $main[0].clientWidth
      that.height = $main[0].clientHeight
      // 调整尺寸
      //that.hud.setAttributeNS(null, 'width', that.width)
      //that.hud.setAttributeNS(null, 'height', that.height)

      renderer.setSize(that.width, that.height)
    }

    renderer = new THREE.WebGLRenderer({
      antialias: true
    })

    renderer.setPixelRatio(window.devicePixelRatio)
    resizeCanvas()

    renderer.gammaOutput = true
    renderer.gammaFactor = 2.2
    $container.append(renderer.domElement)

    scene = new THREE.Scene() 
    scene.background = new THREE.Color(0xffffff)

    camera = new THREE.PerspectiveCamera( 55, that.width / that.height, 1, 20000 );
    camera.position.set( 30, 30, 100 );

    controls = new OrbitControls(camera, renderer.domElement) 
    controls.target.set(0, 0, 0)
    //上下翻转的最大角度
    controls.maxPolarAngle = 1.5
    //上下翻转的最小角度
    controls.minPolarAngle = 0.3
    //设置相机距离原点的最近距离
    controls.minDistance = 10
    //设置相机距离原点的最远距离
    controls.maxDistance = 500
    //是否开启右键拖拽
    controls.enablePan = false

    scene.add(new THREE.AmbientLight(0xffffff))

    light = new THREE.DirectionalLight( 0xffffff, 0.8 );
    scene.add( light );

    var axes = new THREE.AxisHelper(800);//参数设置了三条轴线的长度
    scene.add(axes);

    // Water
    var waterGeometry = new THREE.PlaneBufferGeometry( 10000, 10000 );
    var water = new Water(
      waterGeometry,
      {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load( 'textures/water/waternormals.jpg', function ( texture ) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        } ),
        alpha: 1.0,
        sunDirection: light.position.clone().normalize(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: false
      }
    );
    water.rotation.x = - Math.PI / 2;
    scene.add( water );

    // Skybox
    var sky = new Sky();
    sky.scale.setScalar( 10000 );
    scene.add( sky );
    var uniforms = sky.material.uniforms;
    uniforms.turbidity.value = 10;
    uniforms.rayleigh.value = 2;
    uniforms.luminance.value = 1;
    uniforms.mieCoefficient.value = 0.005;
    uniforms.mieDirectionalG.value = 0.8;
    var parameters = {
      distance: 400,
      inclination: 0.2,
      azimuth: 0.205
    };
    var cubeCamera = new THREE.CubeCamera( 1, 20000, 256 )
    cubeCamera.renderTarget.texture.generateMipmaps = true
    cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter
    function updateSun() {
      var theta = Math.PI * ( parameters.inclination - 0.5 )
      var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 )
      light.position.x = parameters.distance * Math.cos( phi );
      light.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta )
      light.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta )
      sky.material.uniforms.sunPosition.value = light.position.copy( light.position )
      water.material.uniforms.sunDirection.value.copy( light.position ).normalize()
      cubeCamera.update( renderer, scene )
    }
    updateSun();

    that.raycaster = new THREE.Raycaster()
    that.mouse = new THREE.Vector2()

    // 加载模型定义文件
    this.$http.get('/data/models.json').then(res => {
      that.models = eval('(' + res.bodyText + ')')
      console.log(that.models)

      // 分类
      for( let m of that.models.models) {
        if (m.name) {
          if (that.modelIndex[m.name]) {
            console.warn('models.json error: name is repeated - ', m.name)
          } else {
            that.modelIndex[m.name] = m
          }
        } else {
          console.warn('models.json error: name is undefined - ', m)
        }

        if (m.type) {
          if (!that.modelTypes[m.type]) {
            that.modelTypes[m.type] = []
          }
          that.modelTypes[m.type].push(m)
        } else {
          console.warn('models.json error: type is undefined - ', m)
        }

        if (m.categories) {
          for( let c of m.categories) {
            if (!that.modelCategories[c]) {
              that.modelCategories[c] = []
            }
            that.modelCategories[c].push(m)
          }
        } else {
          console.warn('models.json error: categories is undefined - ', m)
        }
      }

      // 读取055模型
      let def = that.modelIndex[that.name]
      if (def){
        var loader = new GLTFLoader()
        loader.load('models/gltf/'+ def.model, function (gltf) {
          console.log('model', gltf.scene)
          that.model = gltf.scene
          that.model.position.set(0, -2, 0)
          that.model.scale.set(1, 1, 1)
          that.model.userData.hotZone = []
          that.model.userData.def = def
          that.model.userData.id = 0
          //that.model.rotation.y = Math.PI / 2
          scene.add(that.model)

          let treeRoot = {
            id: 0,
            name: that.name,
            model: gltf.scene,
            children: []
          }

          // 查找热区
          that.hotMat.push(new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true, depthTest:false } ))
          that.hotMat.push(new THREE.MeshBasicMaterial( { color: 0xff00ff, opacity: 0.5, transparent: true, depthTest:false } ))

          that.model.traverse( function ( child ) {
            if ( child.isMesh && child.name && child.name.endsWith('_h')) {

              child.material = that.hotMat[0]
              that.model.userData.hotZone.push(child)

              // 关联定义
              if(def.installs) {
                child.userData.def = def.installs[child.name]
                child.userData.id = nodeId
                treeRoot.children.push({
                  id: nodeId++,
                  name: child.name,
                  model: child,
                  children: []
                })
              }
            }
          })

          that.scenetreeData.push(treeRoot)
          console.log(treeRoot)

        }, undefined, function (e) {
          console.error(e)
        })

      }

    }, error => {
      console.info(error)
    })

    window.onresize = function () {
      resizeCanvas()
      camera.aspect = that.width / that.height
      camera.updateProjectionMatrix()

    }

    function animate() {
      requestAnimationFrame(animate)
      var delta = clock.getDelta()
      controls.update(delta)
      water.material.uniforms.time.value += 1.0 / 60.0;
      renderer.render(scene, camera)
    }

    that.options = {
      name: ''
    }
    that.gui = new dat.GUI({ autoPlace: false });
    $(that.$el).find('.controls').append(that.gui.domElement);
    that.gui.add(that.options, {key:'name', title:"模型ID"});

    $('.container').on('mousemove', function () {
      event.preventDefault();

      that.mouse.set( ( event.offsetX / that.width ) * 2 - 1, - ( event.offsetY / that.height ) * 2 + 1 );
      that.raycaster.setFromCamera( that.mouse, camera );
      if (that.model) {
        let intersects = that.raycaster.intersectObjects( that.model.userData.hotZone );
        if ( intersects.length > 0 ) {
          let newIntersect = intersects[ 0 ];
          if( !that.current || newIntersect.object != that.current) {
            if(newIntersect !== that.intersect){
              if (that.intersect) {
                that.intersect.object.material = that.hotMat[0]
              }
              that.intersect = newIntersect
              that.intersect.object.material = that.hotMat[1]
            }
          }
        }
        else{
          if (that.intersect){
            that.intersect.object.material = that.hotMat[0]
            that.intersect = null
          }
        }

        // 朝向摄像头
        if(event.which === 1){
          for(let m of that.model.userData.hotZone) {
            if (m.userData.model && m.userData.model.userData.rotate) {

              // 计算模型与摄像机朝向
              var localCamera = camera.position.clone()
              m.userData.model.worldToLocal(localCamera)

              var north = new THREE.Vector3(0,0,-1)
              var yCamera = new THREE.Vector3(localCamera.x, 0, localCamera.z)
              var y = yCamera.angleTo(north)
              yCamera.cross(north);

              if(yCamera.y>0){
                y = -y //角度是逆时针方向的
              }else{
                //角度是顺时针方向的
                //y = -y
              }

              yCamera = new THREE.Vector3(localCamera.x, 0, localCamera.z)
              var x = localCamera.angleTo(yCamera)
              localCamera.cross(yCamera);

              console.log(localCamera, yCamera, x, y, camera.rotation)

              for(let mc of m.userData.model.userData.rotatey) {
                mc.model.rotation.y = y
              }

              for(let mc of m.userData.model.userData.rotatex) {
                mc.model.rotation.x = THREE.Math.clamp(x, 0, Math.PI/2)
              }
            }
          }
        }
      }

      renderer.render( scene, camera )
    }).on('click', function () {
      if(that.intersect) {
        that.selectModel(that.intersect.object)
        that.$refs.scenegraph.setCurrentKey(that.current ? that.current.userData.id : 0)
        that.intersect = null
      }
    })

    animate()

//    let element = $('.katex')
//    element[0].innerHTML = Katex.renderToString("\\frac 1 7 + \\frac 2 7 =", {displayMode: false})

   }
}
</script>
