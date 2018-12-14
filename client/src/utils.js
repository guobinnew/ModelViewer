/**
 * Created by unique on 2018/12/12.
 */
import $ from 'jquery'
import logger from './logger'

/**
 *  SVG命名空间
 */
const SvgNS = 'http://www.w3.org/2000/svg'

/**
 * 日志前缀
 */
function logPrefix(elem, evt) {
  const tagName = elem.tagName
  return `${tagName} ${evt} event: `
}

const Utils = {
  common: {
    /**
     * 判断变量类型是否是字符串
     */
    isString: function (val) {
      return typeof val === 'string'
    },

    /**
     * 判断变量类型是否是布尔值
     */
    isBoolean: function (val) {
      return typeof val === 'boolean'
    },

    /**
     * 判断变量类型是否是数值
     */
    isNumber: function (val) {
      return typeof val === 'number'
    },

    /**
     * 改进typeof
     */
    typeOf: function (value) {
      let s = typeof value
      if (s === 'object') {
        if (value) {
          if (value instanceof Array) {
            return 'array'
          } else if (value instanceof Object) {
            return s
          }

          let className = Object.prototype.toString.call(/** @type {!Object} */ (value))
          if (className === '[object Window]') {
            return 'object'
          }

          // 判断是否为数组类型
          if (className === '[object Array]' ||
            (typeof value.length === 'number' &&
            typeof value.splice !== 'undefined' &&
            typeof value.propertyIsEnumerable !== 'undefined' &&
            !value.propertyIsEnumerable('splice'))) {
            return 'array'
          }

          // 判断是否为函数类型
          if (className === '[object Function]' ||
            (typeof value.call !== 'undefined' &&
            typeof value.propertyIsEnumerable !== 'undefined' &&
            !value.propertyIsEnumerable('call'))) {
            return 'function'
          }
        } else {
          return 'null'
        }
      } else if (s === 'function' && typeof value.call === 'undefined') {
        return 'object'
      }
      return s
    },
    /**
     * 判断是否为空
     */
    isNull: function (val) {
      return val == null
    },

    /**
     * 判断是否非空
     */
    isDefAndNotNull: function (val) {
      return val != null
    },

    /**
     * 判断是否为数组
     */
    isArray: function (val) {
      return Utils.common.typeOf(val) === 'array'
    },

    /**
     * 判断是否为类数组
     */
    isArrayLike: function (val) {
      var type = Utils.common.typeOf(val)
      return type === 'array' || (type === 'object' && typeof val.length === 'number')
    },

    /**
     * 判断是否为函数
     */
    isFunction: function (val) {
      return Utils.common.typeOf(val) === 'function'
    },

    /**
     * 判断是否为对象
     */
    isObject: function (val) {
      var type = typeof val
      return (type === 'object' && val != null) || type === 'function'
    }

  },
  svg: {
    elementNS: function (tag, option) {
      let elem = document.createElementNS(SvgNS, tag)
      let opt = option
      if (Utils.common.isObject(opt)) {
        for (let [k, v] of Object.entries(opt)) {
          if (k === '$children') {
            for (let child of v) {
              elem.appendChild(Utils.svg.elementNS(child.tag, child.option))
            }
          } else if (k === '$text') {
            elem.textContent = v
          } else {
            logger.warn('element:', k, v)
            elem.setAttributeNS(null, k, v)
          }
        }
      }
      return elem
    },

    element: function (tag, option) {
      let elem = document.createElement(tag)
      let opt = option
      if (Utils.common.isObject(opt)) {
        for (let [k, v] of Object.entries(opt)) {
          if (k === '$children') {
            elem.appendChild(Utils.svg.element(v.tag, v.option))
          } else if (k === '$text') {
            elem.appendChild(document.createTextNode(v))
          } else {
            logger.warn('element:', k, v)
            elem.setAttribute(k, v)
          }
        }
      }
      return elem
    },

    svg: function (option) {
      let svg = Utils.svg.elementNS('svg', option)
      svg.setAttribute('version', '1.1')
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      return svg
    },

    defs: function (option) {
      return Utils.svg.elementNS('defs', option)
    },

    pattern: function (option) {
      return Utils.svg.elementNS('pattern', option)
    },

    filter: function (option) {
      return Utils.svg.elementNS('filter', option)
    },
    /*
     */
    text: function (option) {
      let text = document.createElementNS(SvgNS, 'text')
      let $elem = $(text)
      if (!option) {
        option = {}
      }
      $elem.addClass(option.classes ? (' ' + option.classes) : '')
      text.setAttribute('text-anchor', option.anchor ? option.anchor : 'middle')
      text.setAttribute('dominant-baseline', option.baseline ? option.baseline : 'central')
      text.setAttribute('dy', '0')

      text.setAttribute('x', option.x ? option.x : 0)
      text.setAttribute('y', option.y ? option.y : 0)
      text.setAttribute('transform', `translate(${option.translatex ? option.translatex : 0}, ${option.translatey ? option.translatey : 0})`)
      text.textContent = option.text ? option.text : ''

      return text
    },

    /*
     */
    group: function (option) {
      let g = document.createElementNS(SvgNS, 'g')
      return g
    },
    /*
     */
    rect: function (option) {
      let rect = document.createElementNS(SvgNS, 'rect')
      let radius = option.radius ? option.radius : 4
      rect.setAttribute('rx', radius)
      rect.setAttribute('ry', radius)
      rect.setAttribute('width', option.width ? option.width : 0)
      rect.setAttribute('height', option.height ? option.height : 0)
      option.stroke && rect.setAttribute('stroke', option.stroke)
      option.fill && rect.setAttribute('fill', option.fill)
      option.opacity && rect.setAttribute('fill-opacity', option.opacity)

      return rect
    },

    /**
     * option: height | width | url | x | y
     */
    image: function (option) {
      let img = document.createElementNS(SvgNS, 'image')

      img.setAttribute('height', option.width ? option.width : 0)
      img.setAttribute('width', option.height ? option.height : 0)
      img.setAttribute('transform', 'translate(0,0)')
      img.href.baseVal = option.url

      if (Utils.common.isNumber(option.x)) {
        img.setAttribute('x', option.x)
      }

      if (Utils.common.isNumber(option.y)) {
        img.setAttribute('y', option.y)
      }

      return img
    }
  }
}

export default Utils