'use strict';
//util.js
filepicker.extend('util', function(){
    var fp = this;
    var isArray = function(o) {
        return o && Object.prototype.toString.call(o) === '[object Array]';
    };

    var isFile = function(o) {
        return o && Object.prototype.toString.call(o) === '[object File]';
    };

    var isElement = function(o) {
      //Returns true if it is a DOM element    
      if (typeof window.HTMLElement === 'object') {
         return o instanceof window.HTMLElement; //DOM2
      } else {
        return o && typeof o === 'object' && o.nodeType === 1 && typeof o.nodeName==='string';
      }
    };


    var isFileInputElement = function(o) {
        return isElement(o) && o.tagName === 'INPUT' && o.type === 'file';
    };

    var typeOf = function(value){
        if (value === null) {
            return 'null';
        } else if (isArray(value)) {
            return 'array';
        } else if (isFile(value)) {
            return 'file';
        }
        return typeof value;
    };

    var getId = function(){
        var d = new Date();
        return d.getTime().toString();
    };
    
    var setDefault = function(obj, key, def) {
        if (obj[key] === undefined) {
            obj[key] = def;
        }
    };

    var addOnLoad = function(func) {
        //We check for jquery - if we have it, use document.ready, else window onload
        if (window.jQuery) {
            window.jQuery(function(){
                func();
            });
        } else {
            var evnt = 'load';
            // W3C DOM
            if (window.addEventListener){
                window.addEventListener(evnt,func,false);
            } else if (window.attachEvent) { // IE DOM
                window.attachEvent('on'+evnt, func);
            } else {
                if (window.onload) {
                    var curr = window.onload;
                    window.onload = function(){
                        curr();
                        func();
                    };
                } else {
                    window.onload = func;
                }
            }
        }
    };

    //should probably be moved to strutils
    var isFPUrl = function(url) {
        return typeof url === 'string' && url.match('www.filepicker.io/api/file/');
    };

    // What about cdn 
    var isFPUrlCdn = function(url) {
        return typeof url === 'string' && url.match('/api/file/');
    };

    var consoleWrap = function(fn) {
        return function(){
            if (window.console && typeof window.console[fn] === 'function') {
                try {
                    window.console[fn].apply(window.console, arguments);
                } catch (e) {
                    window.alert(Array.prototype.join.call(arguments, ','));
                }
            }
        };
    };

    var console = {};
    console.log = consoleWrap('log');
    console.error = consoleWrap('error');

    //Note - only does shallow clones
    var clone = function(o) {
        var ret = {};
        for (var key in o) {
            ret[key] = o[key];
        }
        return ret;
    };

    var standardizeFPFile = function(json){
        var fpfile = {};
        fpfile.url = json.url;
        fpfile.filename = json.filename || json.name;
        fpfile.mimetype = json.mimetype || json.type;
        fpfile.size = json.size;
        fpfile.key = json.key || json.s3_key;
        fpfile.isWriteable = !!(json.isWriteable || json.writeable);
        return fpfile;
    };

    var isCanvasSupported = function(){
        // IE8 is crashing on it 
        try {
            var elem = document.createElement('canvas');
            return !!(elem.getContext && elem.getContext('2d'));
        } catch(err) {
            return false;
        }
    };

    return {
        isArray: isArray,
        isFile: isFile,
        isElement: isElement,
        isFileInputElement: isFileInputElement,
        getId: getId,
        setDefault: setDefault,
        typeOf: typeOf,
        addOnLoad: addOnLoad,
        isFPUrl: isFPUrl,
        isFPUrlCdn: isFPUrlCdn,
        console: console,
        clone: clone,
        standardizeFPFile: standardizeFPFile,
        isCanvasSupported: isCanvasSupported
    };
});