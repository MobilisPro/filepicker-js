(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.filepicker = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
"use strict";

(function() {
    var fp = function() {
        var context = {};
        var addObjectTo = function(name, obj, base) {
            var path = name.split(".");
            for (var i = 0; i < path.length - 1; i++) {
                if (!base[path[i]]) {
                    base[path[i]] = {};
                }
                base = base[path[i]];
            }
            if (typeof obj === "function") {
                if (obj.isClass) {
                    base[path[i]] = obj;
                } else {
                    base[path[i]] = function() {
                        return obj.apply(context, arguments);
                    };
                }
            } else {
                base[path[i]] = obj;
            }
        };
        var extendObject = function(name, obj, is_public) {
            addObjectTo(name, obj, context);
            if (is_public) {
                addObjectTo(name, obj, window.filepicker);
            }
        };
        var extend = function(pkg, init_fn, is_public) {
            if (typeof pkg === "function") {
                is_public = init_fn;
                init_fn = pkg;
                pkg = "";
            }
            if (pkg) {
                pkg += ".";
            }
            var objs = init_fn.call(context);
            for (var obj_name in objs) {
                extendObject(pkg + obj_name, objs[obj_name], is_public);
            }
        };
        var internal = function(fn) {
            fn.apply(context, arguments);
        };
        return {
            extend: extend,
            internal: internal
        };
    }();
    if (!window.filepicker) {
        window.filepicker = fp;
    } else {
        for (var attr in fp) {
            window.filepicker[attr] = fp[attr];
        }
    }
})();

"use strict";

filepicker.extend("comm", function() {
    var fp = this;
    var COMM_IFRAME_NAME = "filepicker_comm_iframe";
    var API_IFRAME_NAME = "fpapi_comm_iframe";
    var openCommIframe = function() {
        if (window.frames[COMM_IFRAME_NAME] === undefined) {
            openCommunicationsChannel();
            var commIFrame;
            commIFrame = document.createElement("iframe");
            commIFrame.id = commIFrame.name = COMM_IFRAME_NAME;
            commIFrame.src = fp.urls.COMM;
            commIFrame.style.display = "none";
            document.body.appendChild(commIFrame);
        }
        if (window.frames[API_IFRAME_NAME] === undefined) {
            openCommunicationsChannel();
            var apiIFrame;
            apiIFrame = document.createElement("iframe");
            apiIFrame.id = apiIFrame.name = API_IFRAME_NAME;
            apiIFrame.src = fp.urls.API_COMM;
            apiIFrame.style.display = "none";
            document.body.appendChild(apiIFrame);
        }
    };
    var communicationsHandler = function(event) {
        if (event.origin !== fp.urls.BASE && event.origin !== fp.urls.DIALOG_BASE) {
            return;
        }
        var data = fp.json.parse(event.data);
        fp.handlers.run(data);
    };
    var isOpen = false;
    var openCommunicationsChannel = function() {
        if (isOpen) {
            return;
        } else {
            isOpen = true;
        }
        if (window.addEventListener) {
            window.addEventListener("message", communicationsHandler, false);
        } else if (window.attachEvent) {
            window.attachEvent("onmessage", communicationsHandler);
        } else {
            throw new fp.FilepickerException("Unsupported browser");
        }
    };
    var destroyCommIframe = function() {
        if (window.removeEventListener) {
            window.removeEventListener("message", communicationsHandler, false);
        } else if (window.attachEvent) {
            window.detachEvent("onmessage", communicationsHandler);
        } else {
            throw new fp.FilepickerException("Unsupported browser");
        }
        if (!isOpen) {
            return;
        } else {
            isOpen = false;
        }
        var iframes = document.getElementsByName(COMM_IFRAME_NAME);
        for (var i = 0; i < iframes.length; i++) {
            iframes[i].parentNode.removeChild(iframes[i]);
        }
        try {
            delete window.frames[COMM_IFRAME_NAME];
        } catch (e) {}
        var api_iframes = document.getElementsByName(API_IFRAME_NAME);
        for (var j = 0; j < api_iframes.length; j++) {
            api_iframes[j].parentNode.removeChild(api_iframes[j]);
        }
        try {
            delete window.frames[API_IFRAME_NAME];
        } catch (e) {}
    };
    return {
        openChannel: openCommIframe,
        closeChannel: destroyCommIframe
    };
});

"use strict";

filepicker.extend("comm_fallback", function() {
    var fp = this;
    var FP_COMM_IFRAME_NAME = "filepicker_comm_iframe";
    var HOST_COMM_IFRAME_NAME = "host_comm_iframe";
    var base_host_location = "";
    var hash_check_interval = 200;
    var openCommIframe = function() {
        openHostCommIframe();
    };
    var openHostCommIframe = function() {
        if (window.frames[HOST_COMM_IFRAME_NAME] === undefined) {
            var hostCommIFrame;
            hostCommIFrame = document.createElement("iframe");
            hostCommIFrame.id = hostCommIFrame.name = HOST_COMM_IFRAME_NAME;
            base_host_location = hostCommIFrame.src = fp.urls.constructHostCommFallback();
            hostCommIFrame.style.display = "none";
            var onload = function() {
                base_host_location = hostCommIFrame.contentWindow.location.href;
                openFPCommIframe();
            };
            if (hostCommIFrame.attachEvent) {
                hostCommIFrame.attachEvent("onload", onload);
            } else {
                hostCommIFrame.onload = onload;
            }
            document.body.appendChild(hostCommIFrame);
        }
    };
    var openFPCommIframe = function() {
        if (window.frames[FP_COMM_IFRAME_NAME] === undefined) {
            var fpCommIFrame;
            fpCommIFrame = document.createElement("iframe");
            fpCommIFrame.id = fpCommIFrame.name = FP_COMM_IFRAME_NAME;
            fpCommIFrame.src = fp.urls.FP_COMM_FALLBACK + "?host_url=" + encodeURIComponent(base_host_location);
            fpCommIFrame.style.display = "none";
            document.body.appendChild(fpCommIFrame);
        }
        openCommunicationsChannel();
    };
    var isOpen = false;
    var timer;
    var lastHash = "";
    var checkHash = function() {
        var comm_iframe = window.frames[FP_COMM_IFRAME_NAME];
        if (!comm_iframe) {
            return;
        }
        var host_iframe = comm_iframe.frames[HOST_COMM_IFRAME_NAME];
        if (!host_iframe) {
            return;
        }
        var hash = host_iframe.location.hash;
        if (hash && hash.charAt(0) === "#") {
            hash = hash.substr(1);
        }
        if (hash === lastHash) {
            return;
        }
        lastHash = hash;
        if (!lastHash) {
            return;
        }
        var data;
        try {
            data = fp.json.parse(hash);
        } catch (e) {}
        if (data) {
            fp.handlers.run(data);
        }
    };
    var openCommunicationsChannel = function() {
        if (isOpen) {
            return;
        } else {
            isOpen = true;
        }
        timer = window.setInterval(checkHash, hash_check_interval);
    };
    var destroyCommIframe = function() {
        window.clearInterval(timer);
        if (!isOpen) {
            return;
        } else {
            isOpen = false;
        }
        var iframes = document.getElementsByName(FP_COMM_IFRAME_NAME);
        for (var i = 0; i < iframes.length; i++) {
            iframes[i].parentNode.removeChild(iframes[i]);
        }
        try {
            delete window.frames[FP_COMM_IFRAME_NAME];
        } catch (e) {}
        iframes = document.getElementsByName(HOST_COMM_IFRAME_NAME);
        for (i = 0; i < iframes.length; i++) {
            iframes[i].parentNode.removeChild(iframes[i]);
        }
        try {
            delete window.frames[HOST_COMM_IFRAME_NAME];
        } catch (e) {}
    };
    var isEnabled = !("postMessage" in window);
    var setEnabled = function(enabled) {
        if (enabled !== isEnabled) {
            isEnabled = !!enabled;
            if (isEnabled) {
                activate();
            } else {
                deactivate();
            }
        }
    };
    var old_comm;
    var activate = function() {
        old_comm = fp.comm;
        fp.comm = {
            openChannel: openCommIframe,
            closeChannel: destroyCommIframe
        };
    };
    var deactivate = function() {
        fp.comm = old_comm;
        old_comm = undefined;
    };
    if (isEnabled) {
        activate();
    }
    return {
        openChannel: openCommIframe,
        closeChannel: destroyCommIframe,
        isEnabled: isEnabled
    };
});

"use strict";

filepicker.extend("cookies", function() {
    var fp = this;
    var getReceiveCookiesMessage = function(callback) {
        var handler = function(data) {
            if (data.type !== "ThirdPartyCookies") {
                return;
            }
            fp.cookies.THIRD_PARTY_COOKIES = !!data.payload;
            if (callback && typeof callback === "function") {
                callback(!!data.payload);
            }
        };
        return handler;
    };
    var checkThirdParty = function(callback) {
        var handler = getReceiveCookiesMessage(callback);
        fp.handlers.attach("cookies", handler);
        fp.comm.openChannel();
    };
    return {
        checkThirdParty: checkThirdParty
    };
});

"use strict";

filepicker.extend("handlers", function() {
    var fp = this;
    var storage = {};
    var attachHandler = function(id, handler) {
        if (storage.hasOwnProperty(id)) {
            storage[id].push(handler);
        } else {
            storage[id] = [ handler ];
        }
        return handler;
    };
    var detachHandler = function(id, fn) {
        var handlers = storage[id];
        if (!handlers) {
            return;
        }
        if (fn) {
            for (var i = 0; i < handlers.length; i++) {
                if (handlers[i] === fn) {
                    handlers.splice(i, 1);
                    break;
                }
            }
            if (handlers.length === 0) {
                delete storage[id];
            }
        } else {
            delete storage[id];
        }
    };
    var run = function(data) {
        var callerId = data.id;
        if (storage.hasOwnProperty(callerId)) {
            var handlers = storage[callerId];
            for (var i = 0; i < handlers.length; i++) {
                handlers[i](data);
            }
            return true;
        }
        return false;
    };
    return {
        attach: attachHandler,
        detach: detachHandler,
        run: run
    };
});

"use strict";

filepicker.extend("exporter", function() {
    var fp = this;
    var normalizeOptions = function(options) {
        var normalize = function(singular, plural, def) {
            if (options[plural] && !fp.util.isArray(options[plural])) {
                options[plural] = [ options[plural] ];
            } else if (options[singular]) {
                options[plural] = [ options[singular] ];
            } else if (def) {
                options[plural] = def;
            }
        };
        if (options.mimetype && options.extension) {
            throw fp.FilepickerException("Error: Cannot pass in both mimetype and extension parameters to the export function");
        }
        normalize("service", "services");
        if (options.services) {
            for (var i = 0; i < options.services.length; i++) {
                var service = ("" + options.services[i]).replace(" ", "");
                var sid = fp.services[service];
                options.services[i] = sid === undefined ? service : sid;
            }
        }
        if (options.openTo) {
            options.openTo = fp.services[options.openTo] || options.openTo;
        }
        fp.util.setDefault(options, "container", fp.browser.openInModal() ? "modal" : "window");
    };
    var getExportHandler = function(onSuccess, onError) {
        var handler = function(data) {
            if (data.type !== "filepickerUrl") {
                return;
            }
            if (data.error) {
                fp.util.console.error(data.error);
                onError(fp.errors.FPError(132));
            } else {
                var fpfile = {};
                fpfile.url = data.payload.url;
                fpfile.filename = data.payload.data.filename;
                fpfile.mimetype = data.payload.data.type;
                fpfile.size = data.payload.data.size;
                fpfile.client = data.payload.data.client;
                fpfile.isWriteable = true;
                onSuccess(fpfile);
            }
            fp.modal.close();
        };
        return handler;
    };
    var createExporter = function(input, options, onSuccess, onError) {
        normalizeOptions(options);
        var api = {
            close: function() {
                fp.modal.close();
            }
        };
        if (options.debug) {
            setTimeout(function() {
                onSuccess({
                    id: 1,
                    url: "https://www.filepicker.io/api/file/-nBq2onTSemLBxlcBWn1",
                    filename: "test.png",
                    mimetype: "image/png",
                    size: 58979,
                    client: "computer"
                });
            }, 1);
            return api;
        }
        if (fp.cookies.THIRD_PARTY_COOKIES === undefined) {
            var alreadyHandled = false;
            fp.cookies.checkThirdParty(function() {
                if (!alreadyHandled) {
                    createExporter(input, options, onSuccess, onError);
                    alreadyHandled = true;
                }
            });
            return api;
        }
        var id = fp.util.getId();
        var finished = false;
        var onSuccessMark = function(fpfile) {
            finished = true;
            onSuccess(fpfile);
        };
        var onErrorMark = function(fperror) {
            finished = true;
            onError(fperror);
        };
        var onClose = function() {
            if (!finished) {
                finished = true;
                onError(fp.errors.FPError(131));
            }
        };
        fp.window.open(options.container, fp.urls.constructExportUrl(input, options, id), onClose);
        fp.handlers.attach(id, getExportHandler(onSuccessMark, onErrorMark));
        return api;
    };
    return {
        createExporter: createExporter
    };
});

"use strict";

filepicker.extend("modal", function() {
    var fp = this, SHADE_NAME = "filepicker_shade", WINDOW_CONTAINER_NAME = "filepicker_dialog_container";
    var originalBody = getHtmlTag();
    if (originalBody) {
        var originalOverflow = originalBody.style.overflow;
    }
    var generateModal = function(modalUrl, onClose) {
        appendStyle();
        var shade = createModalShade(onClose), container = createModalContainer(), close = createModalClose(onClose), modal = document.createElement("iframe");
        modal.name = fp.window.WINDOW_NAME;
        modal.id = fp.window.WINDOW_NAME;
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.border = "none";
        modal.style.position = "relative";
        modal.setAttribute("border", 0);
        modal.setAttribute("frameborder", 0);
        modal.setAttribute("frameBorder", 0);
        modal.setAttribute("marginwidth", 0);
        modal.setAttribute("marginheight", 0);
        modal.src = modalUrl;
        container.appendChild(modal);
        shade.appendChild(close);
        shade.appendChild(container);
        document.body.appendChild(shade);
        var body = getHtmlTag();
        if (body) {
            body.style.overflow = "hidden";
        }
        return modal;
    };
    var createModalShade = function(onClose) {
        var shade = document.createElement("div");
        shade.id = SHADE_NAME;
        shade.className = "fp__overlay";
        shade.onclick = getCloseModal(onClose);
        return shade;
    };
    var createModalContainer = function() {
        var modalcontainer = document.createElement("div");
        modalcontainer.id = WINDOW_CONTAINER_NAME;
        modalcontainer.className = "fp__container";
        return modalcontainer;
    };
    var createModalClose = function(onClose) {
        var close = document.createElement("div");
        close.className = "fp__close";
        var closeAnchor = document.createElement("a");
        closeAnchor.appendChild(document.createTextNode("X"));
        close.appendChild(closeAnchor);
        closeAnchor.onclick = getCloseModal(onClose);
        document.onkeydown = function(evt) {
            evt = evt || window.event;
            if (evt.keyCode === 27) {
                getCloseModal(onClose)();
            }
        };
        return close;
    };
    var getCloseModal = function(onClose, force) {
        force = !!force;
        return function() {
            if (fp.uploading && !force) {
                if (!window.confirm('You are currently uploading. If you choose "OK", the window will close and your upload will not finish. Do you want to stop uploading and close the window?')) {
                    return;
                }
            }
            fp.uploading = false;
            document.onkeydown = null;
            setOriginalOverflow();
            var shade = document.getElementById(SHADE_NAME);
            if (shade) {
                document.body.removeChild(shade);
            }
            var container = document.getElementById(WINDOW_CONTAINER_NAME);
            if (container) {
                document.body.removeChild(container);
            }
            try {
                delete window.frames[fp.window.WINDOW_NAME];
            } catch (e) {}
            if (onClose) {
                onClose();
            }
        };
    };
    function hide() {
        var shade = document.getElementById(SHADE_NAME);
        if (shade) {
            shade.hidden = true;
        }
        var container = document.getElementById(WINDOW_CONTAINER_NAME);
        if (container) {
            container.hidden = true;
        }
        setOriginalOverflow();
    }
    function setOriginalOverflow() {
        var body = getHtmlTag();
        if (body) {
            body.style.overflow = originalOverflow;
        }
    }
    function appendStyle() {
        var css = ".fp__overlay {top: 0;right: 0;bottom: 0;left: 0;z-index: 1000;background: rgba(0, 0, 0, 0.8);}" + ".fp__close {top: 104px; right: 108px; width: 35px; height: 35px; z-index: 20; cursor: pointer}" + "@media screen and (max-width: 768px), screen and (max-height: 500px) {.fp__close {top: 15px; right: 12px;}}" + ".fp__close a {text-indent: -9999px; overflow: hidden; display: block; width: 100%; height: 100%; background: url(https://d1zyh3sbxittvg.cloudfront.net/close.png) 50% 50% no-repeat;}" + ".fp__close a:hover {background-color: rgba(0,0,0, .02); opacity: .8;}" + "@media screen and (max-width: 768px), screen and (max-height: 500px) {top: 14px; right: 14px;}" + ".fp__copy {display: none;}" + ".fp__container {-webkit-overflow-scrolling: touch; overflow: hidden; min-height: 300px; top: 100px;right: 100px;bottom: 100px;left: 100px;background: #eee; box-sizing:content-box; -webkit-box-sizing:content-box; -moz-box-sizing:content-box;}" + "@media screen and (max-width: 768px), screen and (max-height: 500px) {.fp__copy {bottom: 0; left: 0; right: 0; height: 20px; background: #333;}}" + "@media screen and (max-width: 768px), screen and (max-height: 500px) {.fp__copy a {margin-left: 5px;}}" + "@media screen and (max-width: 768px), screen and (max-height: 500px) {.fp__container {top: 0;right: 0;bottom: 0;left: 0;}}" + ".fp__overlay, .fp__close, .fp__copy, .fp__container {position: fixed;}";
        var head = document.head || document.getElementsByTagName("head")[0], style = document.createElement("style");
        style.type = "text/css";
        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        head.appendChild(style);
    }
    function getHtmlTag() {
        try {
            return document.getElementsByTagName("html")[0];
        } catch (err) {
            return null;
        }
    }
    var closeModal = getCloseModal(function() {});
    return {
        generate: generateModal,
        close: closeModal,
        hide: hide
    };
});

"use strict";

filepicker.extend("picker", function() {
    var fp = this;
    var normalizeOptions = function(options) {
        var normalize = function(singular, plural, def) {
            if (options[plural]) {
                if (!fp.util.isArray(options[plural])) {
                    options[plural] = [ options[plural] ];
                }
            } else if (options[singular]) {
                options[plural] = [ options[singular] ];
            } else if (def) {
                options[plural] = def;
            }
        };
        normalize("service", "services");
        normalize("mimetype", "mimetypes");
        normalize("extension", "extensions");
        if (options.services) {
            for (var i = 0; i < options.services.length; i++) {
                var service = ("" + options.services[i]).replace(" ", "");
                if (fp.services[service] !== undefined) {
                    service = fp.services[service];
                }
                options.services[i] = service;
            }
        }
        if (options.mimetypes && options.extensions) {
            throw fp.FilepickerException("Error: Cannot pass in both mimetype and extension parameters to the pick function");
        }
        if (!options.mimetypes && !options.extensions) {
            options.mimetypes = [ "*/*" ];
        }
        if (options.openTo) {
            options.openTo = fp.services[options.openTo] || options.openTo;
        }
        fp.util.setDefault(options, "container", fp.browser.openInModal() ? "modal" : "window");
    };
    var getPickHandler = function(onSuccess, onError, onProgress) {
        var handler = function(data) {
            if (filterDataType(data, onProgress)) {
                return;
            }
            fp.uploading = false;
            if (data.error) {
                fp.util.console.error(data.error);
                if (data.error.code) {
                    onError(fp.errors.FPError(data.error.code));
                } else {
                    onError(fp.errors.FPError(102));
                    fp.modal.close();
                }
            } else {
                var fpfile = fpfileFromPayload(data.payload);
                onSuccess(fpfile);
                fp.modal.close();
            }
        };
        return handler;
    };
    var getPickFolderHandler = function(onSuccess, onError, onProgress) {
        var handler = function(data) {
            if (filterDataType(data, onProgress)) {
                return;
            }
            fp.uploading = false;
            if (data.error) {
                fp.util.console.error(data.error);
                onError(fp.errors.FPError(102));
            } else {
                data.payload.data.url = data.payload.url;
                onSuccess(data.payload.data);
            }
            fp.modal.close();
        };
        return handler;
    };
    var getUploadingHandler = function(onUploading) {
        onUploading = onUploading || function() {};
        var handler = function(data) {
            if (data.type !== "uploading") {
                return;
            }
            fp.uploading = !!data.payload;
            onUploading(fp.uploading);
        };
        return handler;
    };
    var addIfExist = function(data, fpfile, key) {
        if (data[key]) {
            fpfile[key] = data[key];
        }
    };
    var fpfileFromPayload = function(payload) {
        var fpfile = {};
        var url = payload.url;
        if (url && url.url) {
            url = url.url;
        }
        fpfile.url = url;
        var data = payload.url.data || payload.data;
        fpfile.filename = data.filename;
        fpfile.mimetype = data.type;
        fpfile.size = data.size;
        if (data.cropped !== undefined) {
            fpfile.cropped = data.cropped;
        }
        if (data.rotated !== undefined) {
            fpfile.rotated = data.rotated;
        }
        if (data.converted !== undefined) {
            fpfile.converted = data.converted;
        }
        addIfExist(data, fpfile, "id");
        addIfExist(data, fpfile, "key");
        addIfExist(data, fpfile, "container");
        addIfExist(data, fpfile, "path");
        addIfExist(data, fpfile, "client");
        fpfile.isWriteable = true;
        return fpfile;
    };
    var getPickMultipleHandler = function(onSuccess, onError, onProgress) {
        var handler = function(data) {
            if (filterDataType(data, onProgress)) {
                return;
            }
            fp.uploading = false;
            if (data.error) {
                fp.util.console.error(data.error);
                onError(fp.errors.FPError(102));
            } else {
                var fpfiles = [];
                if (!fp.util.isArray(data.payload)) {
                    data.payload = [ data.payload ];
                }
                for (var i = 0; i < data.payload.length; i++) {
                    var fpfile = fpfileFromPayload(data.payload[i]);
                    fpfiles.push(fpfile);
                }
                onSuccess(fpfiles);
            }
            fp.modal.close();
        };
        return handler;
    };
    var createPicker = function(options, onSuccess, onError, multiple, folder, onProgress, convertFile) {
        normalizeOptions(options);
        var api = {
            close: function() {
                fp.modal.close();
            }
        };
        if (options.debug) {
            var dumy_data = {
                id: 1,
                url: "https://www.filepicker.io/api/file/-nBq2onTSemLBxlcBWn1",
                filename: "test.png",
                mimetype: "image/png",
                size: 58979,
                client: "computer"
            };
            var dumy_callback;
            if (multiple || options.storeLocation) {
                dumy_callback = [ dumy_data, dumy_data, dumy_data ];
            } else {
                dumy_callback = dumy_data;
            }
            setTimeout(function() {
                onSuccess(dumy_callback);
            }, 1);
            return api;
        }
        if (fp.cookies.THIRD_PARTY_COOKIES === undefined) {
            var alreadyHandled = false;
            fp.cookies.checkThirdParty(function() {
                if (!alreadyHandled) {
                    createPicker(options, onSuccess, onError, !!multiple, folder, onProgress);
                    alreadyHandled = true;
                }
            });
            return api;
        }
        var id = fp.util.getId();
        var finished = false;
        var onSuccessMark = function(fpfile) {
            if (options.container === "window") {
                window.onbeforeunload = null;
            }
            finished = true;
            onSuccess(fpfile);
        };
        var onErrorMark = function(fperror) {
            finished = true;
            onError(fperror);
        };
        var onClose = function() {
            if (!finished) {
                finished = true;
                onError(fp.errors.FPError(101));
            }
        };
        var url;
        var handler;
        if (convertFile) {
            url = fp.urls.constructConvertUrl(options, id);
            handler = getPickHandler(onSuccessMark, onErrorMark, onProgress);
        } else if (multiple) {
            url = fp.urls.constructPickUrl(options, id, true);
            handler = getPickMultipleHandler(onSuccessMark, onErrorMark, onProgress);
        } else if (folder) {
            url = fp.urls.constructPickFolderUrl(options, id);
            handler = getPickFolderHandler(onSuccessMark, onErrorMark, onProgress);
        } else {
            url = fp.urls.constructPickUrl(options, id, false);
            handler = getPickHandler(onSuccessMark, onErrorMark, onProgress);
        }
        fp.window.open(options.container, url, onClose);
        fp.handlers.attach(id, handler);
        var key = id + "-upload";
        fp.handlers.attach(key, getUploadingHandler(function() {
            fp.handlers.detach(key);
        }));
        return api;
    };
    function filterDataType(data, onProgress) {
        if (data.type === "filepickerProgress") {
            fp.uploading = true;
            if (onProgress) {
                onProgress(data.payload.data);
            }
        } else if (data.type === "notUploading") {
            fp.uploading = false;
        } else if (data.type === "closeModal") {
            fp.modal.close();
        } else if (data.type === "hideModal") {
            fp.modal.hide();
        } else if (data.type === "filepickerUrl" || data.type === "serverHttpError") {
            return false;
        }
        return true;
    }
    return {
        createPicker: createPicker
    };
});

"use strict";

filepicker.extend("window", function() {
    var fp = this;
    var DIALOG_TYPES = {
        OPEN: "/dialog/open/",
        SAVEAS: "/dialog/save/"
    };
    var WINDOW_NAME = "filepicker_dialog";
    var WINDOW_PROPERTIES = "left=100,top=100,height=600,width=800,menubar=no,toolbar=no,location=no,personalbar=no,status=no,resizable=yes,scrollbars=yes,dependent=yes,dialog=yes";
    var CLOSE_CHECK_INTERVAL = 100;
    var openWindow = function(container, src, onClose) {
        onClose = onClose || function() {};
        if (!container && fp.browser.openInModal()) {
            container = "modal";
        } else if (!container) {
            container = "window";
        }
        if (container === "window") {
            var name = WINDOW_NAME + fp.util.getId();
            window.onbeforeunload = function confirmExit() {
                return "Filepicker upload does not complete.";
            };
            var win = window.open(src, name, WINDOW_PROPERTIES);
            if (!win) {
                window.onbeforeunload = null;
                window.alert("Please disable your popup blocker to upload files.");
            }
            var closeCheck = window.setInterval(function() {
                if (!win || win.closed) {
                    window.onbeforeunload = null;
                    window.clearInterval(closeCheck);
                    onClose();
                }
            }, CLOSE_CHECK_INTERVAL);
        } else if (container === "modal") {
            fp.modal.generate(src, onClose);
        } else {
            var container_iframe = document.getElementById(container);
            if (!container_iframe) {
                throw new fp.FilepickerException('Container "' + container + '" not found. This should either be set to "window","modal", or the ID of an iframe that is currently in the document.');
            }
            container_iframe.src = src;
        }
    };
    return {
        open: openWindow,
        WINDOW_NAME: WINDOW_NAME
    };
});

"use strict";

filepicker.extend("conversions", function() {
    var fp = this;
    var valid_parameters = {
        align: "string",
        blurAmount: "number",
        crop: "string or array",
        crop_first: "boolean",
        compress: "boolean",
        exif: "string or boolean",
        filter: "string",
        fit: "string",
        format: "string",
        height: "number",
        policy: "string",
        quality: "number",
        page: "number",
        rotate: "string or number",
        secure: "boolean",
        sharpenAmount: "number",
        signature: "string",
        storeAccess: "string",
        storeContainer: "string",
        storeRegion: "string",
        storeLocation: "string",
        storePath: "string",
        text: "string",
        text_align: "string",
        text_color: "string",
        text_font: "string",
        text_padding: "number",
        text_size: "number",
        watermark: "string",
        watermark_position: "string",
        watermark_size: "number",
        width: "number"
    };
    var rest_map = {
        w: "width",
        h: "height"
    };
    var mapRestParams = function(options) {
        var obj = {};
        for (var key in options) {
            obj[rest_map[key] || key] = options[key];
            if (valid_parameters[rest_map[key] || key] === "number") {
                obj[rest_map[key] || key] = Number(options[key]);
            }
        }
        return obj;
    };
    var checkParameters = function(options) {
        var found;
        for (var key in options) {
            found = false;
            for (var test in valid_parameters) {
                if (key === test) {
                    found = true;
                    if (valid_parameters[test].indexOf(fp.util.typeOf(options[key])) === -1) {
                        throw new fp.FilepickerException("Conversion parameter " + key + " is not the right type: " + options[key] + ". Should be a " + valid_parameters[test]);
                    }
                }
            }
            if (!found) {
                throw new fp.FilepickerException("Conversion parameter " + key + " is not a valid parameter.");
            }
        }
    };
    var convert = function(fp_url, options, onSuccess, onError, onProgress) {
        checkParameters(options);
        if (options.crop && fp.util.isArray(options.crop)) {
            options.crop = options.crop.join(",");
        }
        fp.ajax.post(fp_url + "/convert", {
            data: options,
            json: true,
            success: function(fpfile) {
                onSuccess(fp.util.standardizeFPFile(fpfile));
            },
            error: function(msg, status, xhr) {
                if (msg === "not_found") {
                    onError(new fp.errors.FPError(141));
                } else if (msg === "bad_params") {
                    onError(new fp.errors.FPError(142));
                } else if (msg === "not_authorized") {
                    onError(new fp.errors.FPError(403));
                } else {
                    onError(new fp.errors.FPError(143));
                }
            },
            progress: onProgress
        });
    };
    return {
        convert: convert,
        mapRestParams: mapRestParams
    };
});

"use strict";

filepicker.extend("errors", function() {
    var fp = this;
    var FPError = function(code) {
        if (this === window) {
            return new FPError(code);
        }
        this.code = code;
        if (filepicker.debug) {
            var info = filepicker.error_map[this.code];
            this.message = info.message;
            this.moreInfo = info.moreInfo;
            this.toString = function() {
                return "FPError " + this.code + ": " + this.message + ". For help, see " + this.moreInfo;
            };
        } else {
            this.toString = function() {
                return "FPError " + this.code + ". Include filepicker_debug.js for more info";
            };
        }
        return this;
    };
    FPError.isClass = true;
    var handleError = function(fperror) {
        if (filepicker.debug) {
            fp.util.console.error(fperror.toString());
        }
    };
    return {
        FPError: FPError,
        handleError: handleError
    };
}, true);

"use strict";

filepicker.extend(function() {
    var fp = this, VERSION = "2.4.11";
    fp.API_VERSION = "v2";
    var setKey = function(key) {
        fp.apikey = key;
    };
    var FilepickerException = function(text) {
        this.text = text;
        this.toString = function() {
            return "FilepickerException: " + this.text;
        };
        return this;
    };
    FilepickerException.isClass = true;
    var pick = function(options, onSuccess, onError, onProgress) {
        fp.util.checkApiKey();
        if (typeof options === "function") {
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        return fp.picker.createPicker(options, onSuccess, onError, false, false, onProgress);
    };
    var pickMultiple = function(options, onSuccess, onError, onProgress) {
        fp.util.checkApiKey();
        if (typeof options === "function") {
            onProgress = onError;
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        return fp.picker.createPicker(options, onSuccess, onError, true, false, onProgress);
    };
    var pickAndStore = function(picker_options, store_options, onSuccess, onError, onProgress) {
        fp.util.checkApiKey();
        if (!picker_options || !store_options || typeof picker_options === "function" || typeof picker_options === "function") {
            throw new fp.FilepickerException("Not all required parameters given, missing picker or store options");
        }
        onError = onError || fp.errors.handleError;
        var multiple = !!picker_options.multiple;
        var options = !!picker_options ? fp.util.clone(picker_options) : {};
        options.storeLocation = store_options.location || "S3";
        options.storePath = store_options.path;
        options.storeContainer = store_options.storeContainer || store_options.container;
        options.storeRegion = store_options.storeRegion;
        options.storeAccess = store_options.access || "private";
        if (multiple && options.storePath) {
            if (options.storePath.charAt(options.storePath.length - 1) !== "/") {
                throw new fp.FilepickerException("pickAndStore with multiple files requires a path that ends in " / "");
            }
        }
        var success = onSuccess;
        if (!multiple) {
            success = function(resp) {
                onSuccess([ resp ]);
            };
        }
        return fp.picker.createPicker(options, success, onError, multiple, false, onProgress);
    };
    var pickFolder = function(options, onSuccess, onError, onProgress) {
        fp.util.checkApiKey();
        if (typeof options === "function") {
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        return fp.picker.createPicker(options, onSuccess, onError, false, true, onProgress);
    };
    var read = function(input, options, onSuccess, onError, onProgress) {
        fp.util.checkApiKey();
        if (!input) {
            throw new fp.FilepickerException("No input given - nothing to read!");
        }
        if (typeof options === "function") {
            onProgress = onError;
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        onProgress = onProgress || function() {};
        if (typeof input === "string") {
            if (fp.util.isFPUrl(input)) {
                fp.files.readFromFPUrl(input, options, onSuccess, onError, onProgress);
            } else {
                fp.files.readFromUrl(input, options, onSuccess, onError, onProgress);
            }
        } else if (fp.util.isFileInputElement(input)) {
            if (!input.files) {
                storeThenRead(input, options, onSuccess, onError, onProgress);
            } else if (input.files.length === 0) {
                onError(new fp.errors.FPError(115));
            } else {
                fp.files.readFromFile(input.files[0], options, onSuccess, onError, onProgress);
            }
        } else if (fp.util.isFile(input)) {
            fp.files.readFromFile(input, options, onSuccess, onError, onProgress);
        } else if (input.url) {
            fp.files.readFromFPUrl(input.url, options, onSuccess, onError, onProgress);
        } else {
            throw new fp.FilepickerException("Cannot read given input: " + input + ". Not a url, file input, DOM File, or FPFile object.");
        }
    };
    var storeThenRead = function(input, readOptions, onSuccess, onError, onProgress) {
        onProgress(10);
        fp.store(input, function(fpfile) {
            onProgress(50);
            fp.read(fpfile, readOptions, onSuccess, onError, function(progress) {
                onProgress(50 + progress / 2);
            });
        }, onError);
    };
    var write = function(fpfile, input, options, onSuccess, onError, onProgress) {
        fp.util.checkApiKey();
        if (!fpfile) {
            throw new fp.FilepickerException("No fpfile given - nothing to write to!");
        }
        if (input === undefined || input === null) {
            throw new fp.FilepickerException("No input given - nothing to write!");
        }
        if (typeof options === "function") {
            onProgress = onError;
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        onProgress = onProgress || function() {};
        var fp_url;
        if (fp.util.isFPUrl(fp.util.getFPUrl(fpfile))) {
            fp_url = fpfile;
        } else if (fpfile.url) {
            fp_url = fpfile.url;
        } else {
            throw new fp.FilepickerException("Invalid file to write to: " + fpfile + ". Not a filepicker url or FPFile object.");
        }
        fp_url = fp.util.trimConvert(fp.util.getFPUrl(fp_url));
        if (typeof input === "string") {
            fp.files.writeDataToFPUrl(fp_url, input, options, onSuccess, onError, onProgress);
        } else {
            if (fp.util.isFileInputElement(input)) {
                if (!input.files) {
                    fp.files.writeFileInputToFPUrl(fp_url, input, options, onSuccess, onError, onProgress);
                } else if (input.files.length === 0) {
                    onError(new fp.errors.FPError(115));
                } else {
                    fp.files.writeFileToFPUrl(fp_url, input.files[0], options, onSuccess, onError, onProgress);
                }
            } else if (fp.util.isFile(input)) {
                fp.files.writeFileToFPUrl(fp_url, input, options, onSuccess, onError, onProgress);
            } else if (input.url) {
                fp.files.writeUrlToFPUrl(fp_url, input.url, options, onSuccess, onError, onProgress);
            } else {
                throw new fp.FilepickerException("Cannot read from given input: " + input + ". Not a string, file input, DOM File, or FPFile object.");
            }
        }
    };
    var writeUrl = function(fpfile, input, options, onSuccess, onError, onProgress) {
        fp.util.checkApiKey();
        if (!fpfile) {
            throw new fp.FilepickerException("No fpfile given - nothing to write to!");
        }
        if (input === undefined || input === null) {
            throw new fp.FilepickerException("No input given - nothing to write!");
        }
        if (typeof options === "function") {
            onProgress = onError;
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        onProgress = onProgress || function() {};
        var fp_url;
        if (fp.util.isFPUrl(fp.util.getFPUrl(fpfile))) {
            fp_url = fpfile;
        } else if (fpfile.url) {
            fp_url = fpfile.url;
        } else {
            throw new fp.FilepickerException("Invalid file to write to: " + fpfile + ". Not a filepicker url or FPFile object.");
        }
        fp_url = fp.util.getFPUrl(fp_url);
        fp.files.writeUrlToFPUrl(fp.util.trimConvert(fp_url), input, options, onSuccess, onError, onProgress);
    };
    var exportFn = function(input, options, onSuccess, onError) {
        fp.util.checkApiKey();
        if (typeof options === "function") {
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = !!options ? fp.util.clone(options) : {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        var fp_url;
        if (typeof input === "string" && fp.util.isUrl(input)) {
            fp_url = input;
        } else if (input.url) {
            fp_url = input.url;
            if (!options.mimetype && !options.extension) {
                options.mimetype = input.mimetype;
            }
            if (!options.suggestedFilename) {
                options.suggestedFilename = input.filename;
            }
        } else {
            throw new fp.FilepickerException("Invalid file to export: " + input + ". Not a valid url or FPFile object. You may want to use filepicker.store() to get an FPFile to export");
        }
        if (options.suggestedFilename) {
            options.suggestedFilename = encodeURI(options.suggestedFilename);
        }
        return fp.exporter.createExporter(fp_url, options, onSuccess, onError);
    };
    var processImage = function(input, options, onSuccess, onError, onProgress) {
        var convertUrl;
        fp.util.checkApiKey();
        if (typeof options === "function") {
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        if (typeof input === "string") {
            convertUrl = input;
        } else if (input.url) {
            convertUrl = input.url;
            if (!options.filename) {
                options.filename = input.filename;
            }
        } else {
            throw new fp.FilepickerException("Invalid file to convert: " + input + ". Not a valid url or FPFile object or not filepicker url. You can convert only filepicker url images.");
        }
        options.convertUrl = convertUrl;
        options.multiple = false;
        options.services = [ "CONVERT", "COMPUTER" ];
        options.backgroundUpload = true;
        options.hide = false;
        return fp.picker.createPicker(options, onSuccess, onError, false, false, onProgress, true);
    };
    var store = function(input, options, onSuccess, onError, onProgress) {
        fp.util.checkApiKey();
        if (typeof options === "function") {
            onProgress = onError;
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = !!options ? fp.util.clone(options) : {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        onProgress = onProgress || function() {};
        if (typeof input === "string") {
            fp.files.storeData(input, options, onSuccess, onError, onProgress);
        } else {
            if (fp.util.isFileInputElement(input)) {
                if (!input.files) {
                    fp.files.storeFileInput(input, options, onSuccess, onError, onProgress);
                } else if (input.files.length === 0) {
                    onError(new fp.errors.FPError(115));
                } else {
                    fp.files.storeFile(input.files[0], options, onSuccess, onError, onProgress);
                }
            } else if (fp.util.isFile(input)) {
                fp.files.storeFile(input, options, onSuccess, onError, onProgress);
            } else if (input.url) {
                if (!options.filename) {
                    options.filename = input.filename;
                }
                fp.files.storeUrl(input.url, options, onSuccess, onError, onProgress);
            } else {
                throw new fp.FilepickerException("Cannot store given input: " + input + ". Not a string, file input, DOM File, or FPFile object.");
            }
        }
    };
    var storeUrl = function(input, options, onSuccess, onError, onProgress) {
        fp.util.checkApiKey();
        if (typeof options === "function") {
            onProgress = onError;
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        onProgress = onProgress || function() {};
        fp.files.storeUrl(input, options, onSuccess, onError, onProgress);
    };
    var stat = function(fpfile, options, onSuccess, onError) {
        fp.util.checkApiKey();
        if (typeof options === "function") {
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        var fp_url;
        if (fp.util.isFPUrl(fp.util.getFPUrl(fpfile))) {
            fp_url = fpfile;
        } else if (fpfile.url) {
            fp_url = fpfile.url;
        } else {
            throw new fp.FilepickerException("Invalid file to get metadata for: " + fpfile + ". Not a filepicker url or FPFile object.");
        }
        fp_url = fp.util.getFPUrl(fp_url);
        fp.files.stat(fp.util.trimConvert(fp_url), options, onSuccess, onError);
    };
    var remove = function(fpfile, options, onSuccess, onError) {
        fp.util.checkApiKey();
        if (typeof options === "function") {
            onError = onSuccess;
            onSuccess = options;
            options = {};
        }
        options = options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        var fp_url;
        if (fp.util.isFPUrl(fp.util.getFPUrl(fpfile))) {
            fp_url = fpfile;
        } else if (fpfile.url) {
            fp_url = fpfile.url;
        } else {
            throw new fp.FilepickerException("Invalid file to remove: " + fpfile + ". Not a filepicker url or FPFile object.");
        }
        fp_url = fp.util.getFPUrl(fp_url);
        fp.files.remove(fp.util.trimConvert(fp_url), options, onSuccess, onError);
    };
    var convert = function(fpfile, convert_options, store_options, onSuccess, onError, onProgress) {
        fp.util.checkApiKey();
        if (!fpfile) {
            throw new fp.FilepickerException("No fpfile given - nothing to convert!");
        }
        if (typeof store_options === "function") {
            onProgress = onError;
            onError = onSuccess;
            onSuccess = store_options;
            store_options = {};
        }
        var options = !!convert_options ? fp.util.clone(convert_options) : {};
        store_options = store_options || {};
        onSuccess = onSuccess || function() {};
        onError = onError || fp.errors.handleError;
        onProgress = onProgress || function() {};
        if (store_options.location) {
            options.storeLocation = store_options.location;
        }
        if (store_options.path) {
            options.storePath = store_options.path;
        }
        if (store_options.container) {
            options.storeContainer = store_options.container;
        }
        options.storeAccess = store_options.access || "private";
        var fp_url;
        if (fp.util.isFPUrl(fp.util.getFPUrl(fpfile))) {
            fp_url = fpfile;
        } else if (fpfile.url) {
            fp_url = fpfile.url;
            if (!fp.mimetypes.matchesMimetype(fpfile.mimetype, "image/*") && !fp.mimetypes.matchesMimetype(fpfile.mimetype, "application/pdf")) {
                onError(new fp.errors.FPError(142));
                return;
            }
        } else {
            throw new fp.FilepickerException("Invalid file to convert: " + fpfile + ". Not a filepicker url or FPFile object.");
        }
        fp_url = fp.util.getFPUrl(fp_url);
        if (fp_url.indexOf("/convert") > -1) {
            var restConvertOptions = fp.util.parseUrl(fp_url).params;
            restConvertOptions = fp.conversions.mapRestParams(restConvertOptions);
            if (restConvertOptions.crop) {
                fp.util.setDefault(restConvertOptions, "crop_first", true);
            }
            for (var attr in restConvertOptions) {
                fp.util.setDefault(options, attr, restConvertOptions[attr]);
            }
        }
        fp.conversions.convert(fp.util.trimConvert(fp_url), options, onSuccess, onError, onProgress);
    };
    var constructWidget = function(base) {
        return fp.widgets.constructWidget(base);
    };
    var makeDropPane = function(div, options) {
        return fp.dragdrop.makeDropPane(div, options);
    };
    var setResponsiveOptions = function(options) {
        return fp.responsiveImages.setResponsiveOptions(options);
    };
    var responsive = function() {
        fp.responsiveImages.update.apply(null, arguments);
    };
    return {
        setKey: setKey,
        setResponsiveOptions: setResponsiveOptions,
        pick: pick,
        pickFolder: pickFolder,
        pickMultiple: pickMultiple,
        pickAndStore: pickAndStore,
        read: read,
        write: write,
        writeUrl: writeUrl,
        "export": exportFn,
        exportFile: exportFn,
        processImage: processImage,
        store: store,
        storeUrl: storeUrl,
        stat: stat,
        metadata: stat,
        remove: remove,
        convert: convert,
        constructWidget: constructWidget,
        makeDropPane: makeDropPane,
        FilepickerException: FilepickerException,
        responsive: responsive,
        version: VERSION
    };
}, true);

"use strict";

filepicker.extend("mimetypes", function() {
    var fp = this;
    var mimetype_extension_map = {
        ".stl": "application/sla",
        ".hbs": "text/html",
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".jpe": "image/jpeg",
        ".imp": "application/x-impressionist",
        ".vob": "video/dvd"
    };
    var mimetype_bad_array = [ "application/octet-stream", "application/download", "application/force-download", "octet/stream", "application/unknown", "application/x-download", "application/x-msdownload", "application/x-secure-download" ];
    var getMimetype = function(file) {
        if (file.type) {
            var type = file.type;
            type = type.toLowerCase();
            var bad_type = false;
            for (var n = 0; n < mimetype_bad_array.length; n++) {
                bad_type = bad_type || type === mimetype_bad_array[n];
            }
            if (!bad_type) {
                return file.type;
            }
        }
        var filename = file.name || file.fileName;
        var extension = filename.match(/\.\w*$/);
        if (extension) {
            return mimetype_extension_map[extension[0].toLowerCase()] || "";
        } else {
            if (file.type) {
                return file.type;
            } else {
                return "";
            }
        }
    };
    var matchesMimetype = function(test, against) {
        if (!test) {
            return against === "*/*";
        }
        test = fp.util.trim(test).toLowerCase();
        against = fp.util.trim(against).toLowerCase();
        for (var n = 0; n < mimetype_bad_array.length; n++) {
            if (test === mimetype_bad_array[n]) {
                return true;
            }
        }
        var test_parts = test.split("/"), against_parts = against.split("/");
        if (against_parts[0] === "*") {
            return true;
        }
        if (against_parts[0] !== test_parts[0]) {
            return false;
        }
        if (against_parts[1] === "*") {
            return true;
        }
        return against_parts[1] === test_parts[1];
    };
    return {
        getMimetype: getMimetype,
        matchesMimetype: matchesMimetype
    };
});

"use strict";

filepicker.extend("services", function() {
    return {
        COMPUTER: 1,
        DROPBOX: 2,
        FACEBOOK: 3,
        GITHUB: 4,
        GMAIL: 5,
        IMAGE_SEARCH: 6,
        URL: 7,
        WEBCAM: 8,
        GOOGLE_DRIVE: 9,
        SEND_EMAIL: 10,
        INSTAGRAM: 11,
        FLICKR: 12,
        VIDEO: 13,
        EVERNOTE: 14,
        PICASA: 15,
        WEBDAV: 16,
        FTP: 17,
        ALFRESCO: 18,
        BOX: 19,
        SKYDRIVE: 20,
        GDRIVE: 21,
        CUSTOMSOURCE: 22,
        CLOUDDRIVE: 23,
        GENERIC: 24,
        CONVERT: 25,
        AUDIO: 26
    };
}, true);

"use strict";

filepicker.extend("urls", function() {
    var fp = this;
    var base = "https://www.filepicker.io";
    if (window.filepicker.hostname) {
        base = window.filepicker.hostname;
    }
    var dialog_base = base.replace("www", "dialog"), pick_url = dialog_base + "/dialog/open/", export_url = dialog_base + "/dialog/save/", convert_url = dialog_base + "/dialog/process/", pick_folder_url = dialog_base + "/dialog/folder/", store_url = base + "/api/store/";
    var allowedConversions = [ "crop", "rotate", "filter" ];
    var constructPickUrl = function(options, id, multiple) {
        return pick_url + constructModalQuery(options, id) + (multiple ? "&multi=" + !!multiple : "") + (options.mimetypes !== undefined ? "&m=" + options.mimetypes.join(",") : "") + (options.extensions !== undefined ? "&ext=" + options.extensions.join(",") : "") + (options.maxSize ? "&maxSize=" + options.maxSize : "") + (options.customSourceContainer ? "&customSourceContainer=" + options.customSourceContainer : "") + (options.customSourcePath ? "&customSourcePath=" + options.customSourcePath : "") + (options.maxFiles ? "&maxFiles=" + options.maxFiles : "") + (options.folders !== undefined ? "&folders=" + options.folders : "") + (options.storeLocation ? "&storeLocation=" + options.storeLocation : "") + (options.storePath ? "&storePath=" + options.storePath : "") + (options.storeContainer ? "&storeContainer=" + options.storeContainer : "") + (options.storeRegion ? "&storeRegion=" + options.storeRegion : "") + (options.storeAccess ? "&storeAccess=" + options.storeAccess : "") + (options.webcam && options.webcam.webcamDim ? "&wdim=" + options.webcam.webcamDim.join(",") : "") + (options.webcamDim ? "&wdim=" + options.webcamDim.join(",") : "") + (options.webcam && options.webcam.videoRes ? "&videoRes=" + options.webcam.videoRes : "") + (options.webcam && options.webcam.videoLen ? "&videoLen=" + options.webcam.videoLen : "") + (options.webcam && options.webcam.audioLen ? "&audioLen=" + options.webcam.audioLen : "") + constructConversionsQuery(options.conversions);
    };
    var constructConvertUrl = function(options, id) {
        var url = options.convertUrl;
        if (url.indexOf("&") >= 0 || url.indexOf("?") >= 0) {
            url = encodeURIComponent(url);
        }
        return convert_url + constructModalQuery(options, id) + "&curl=" + url + constructConversionsQuery(options.conversions);
    };
    var constructPickFolderUrl = function(options, id) {
        return pick_folder_url + constructModalQuery(options, id);
    };
    var constructExportUrl = function(url, options, id) {
        if (url.indexOf("&") >= 0 || url.indexOf("?") >= 0) {
            url = encodeURIComponent(url);
        }
        return export_url + constructModalQuery(options, id) + "&url=" + url + (options.mimetype !== undefined ? "&m=" + options.mimetype : "") + (options.extension !== undefined ? "&ext=" + options.extension : "") + (options.suggestedFilename ? "&defaultSaveasName=" + options.suggestedFilename : "");
    };
    var constructStoreUrl = function(options) {
        return store_url + options.location + "?key=" + fp.apikey + (options.base64decode ? "&base64decode=true" : "") + (options.mimetype ? "&mimetype=" + options.mimetype : "") + (options.filename ? "&filename=" + encodeURIComponent(options.filename) : "") + (options.path ? "&path=" + options.path : "") + (options.container ? "&container=" + options.container : "") + (options.access ? "&access=" + options.access : "") + constructSecurityQuery(options) + "&plugin=" + getPlugin();
    };
    var constructWriteUrl = function(fp_url, options) {
        return fp_url + "?nonce=fp" + (!!options.base64decode ? "&base64decode=true" : "") + (options.mimetype ? "&mimetype=" + options.mimetype : "") + constructSecurityQuery(options) + "&plugin=" + getPlugin();
    };
    var constructHostCommFallback = function() {
        var parts = fp.util.parseUrl(window.location.href);
        return parts.origin + "/404";
    };
    function constructModalQuery(options, id) {
        return "?key=" + fp.apikey + "&id=" + id + "&referrer=" + window.location.hostname + "&iframe=" + (options.container !== "window") + "&version=" + fp.API_VERSION + (options.services ? "&s=" + options.services.join(",") : "") + (options.container !== undefined ? "&container=" + options.container : "modal") + (options.openTo ? "&loc=" + options.openTo : "") + "&language=" + (options.language || fp.browser.getLanguage()) + (options.mobile !== undefined ? "&mobile=" + options.mobile : "") + (options.backgroundUpload !== undefined ? "&bu=" + options.backgroundUpload : "") + (options.cropRatio ? "&cratio=" + options.cropRatio : "") + (options.cropDim ? "&cdim=" + options.cropDim.join(",") : "") + (options.cropMax ? "&cmax=" + options.cropMax.join(",") : "") + (options.cropMin ? "&cmin=" + options.cropMin.join(",") : "") + (options.cropForce !== undefined ? "&cforce=" + options.cropForce : "") + (options.hide !== undefined ? "&hide=" + options.hide : "") + (options.customCss ? "&css=" + encodeURIComponent(options.customCss) : "") + (options.customText ? "&text=" + encodeURIComponent(options.customText) : "") + (options.imageMin ? "&imin=" + options.imageMin.join(",") : "") + (options.imageMax ? "&imax=" + options.imageMax.join(",") : "") + (options.imageDim ? "&idim=" + options.imageDim.join(",") : "") + (options.imageQuality ? "&iq=" + options.imageQuality : "") + (options.noFileReader ? "&nfl=" + options.noFileReader : "") + (fp.util.isCanvasSupported() ? "" : "&canvas=false") + (options.redirectUrl ? "&redirect_url=" + options.redirectUrl : "") + (options.showClose && options.container !== "modal" ? "&showClose=" + options.showClose : "") + constructSecurityQuery(options) + "&plugin=" + getPlugin();
    }
    function constructSecurityQuery(options) {
        return (options.signature ? "&signature=" + options.signature : "") + (options.policy ? "&policy=" + options.policy : "");
    }
    function getPlugin() {
        return filepicker.plugin || "js_lib";
    }
    function constructConversionsQuery(conversions) {
        conversions = conversions || [];
        var allowed = [], i, j;
        for (i in conversions) {
            for (j in allowedConversions) {
                if (conversions[i] === allowedConversions[j] && conversions.hasOwnProperty(i)) {
                    allowed.push(conversions[i]);
                }
            }
        }
        if (!allowed.length) {
            allowed.push("crop");
        }
        return "&co=" + allowed.join(",");
    }
    return {
        BASE: base,
        DIALOG_BASE: dialog_base,
        API_COMM: base + "/dialog/comm_iframe/",
        COMM: dialog_base + "/dialog/comm_iframe/",
        FP_COMM_FALLBACK: dialog_base + "/dialog/comm_hash_iframe/",
        STORE: store_url,
        PICK: pick_url,
        EXPORT: export_url,
        constructPickUrl: constructPickUrl,
        constructConvertUrl: constructConvertUrl,
        constructPickFolderUrl: constructPickFolderUrl,
        constructExportUrl: constructExportUrl,
        constructWriteUrl: constructWriteUrl,
        constructStoreUrl: constructStoreUrl,
        constructHostCommFallback: constructHostCommFallback,
        getPlugin: getPlugin
    };
});

"use strict";

filepicker.extend("ajax", function() {
    var fp = this;
    var get_request = function(url, options) {
        options.method = "GET";
        make_request(url, options);
    };
    var post_request = function(url, options) {
        options.method = "POST";
        url += (url.indexOf("?") >= 0 ? "&" : "?") + "_cacheBust=" + fp.util.getId();
        make_request(url, options);
    };
    var toQueryString = function(object, base) {
        var queryString = [];
        for (var key in object) {
            var value = object[key];
            if (base) {
                key = base + ". + key + ";
            }
            var result;
            switch (fp.util.typeOf(value)) {
              case "object":
                result = toQueryString(value, key);
                break;

              case "array":
                var qs = {};
                for (var i = 0; i < value.length; i++) {
                    qs[i] = value[i];
                }
                result = toQueryString(qs, key);
                break;

              default:
                result = key + "=" + encodeURIComponent(value);
                break;
            }
            if (value !== null) {
                queryString.push(result);
            }
        }
        return queryString.join("&");
    };
    var getXhr = function() {
        try {
            return new window.XMLHttpRequest();
        } catch (e) {
            try {
                return new window.ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                try {
                    return new window.ActiveXObject("Microsoft.XMLHTTP");
                } catch (e) {
                    return null;
                }
            }
        }
    };
    var make_request = function(url, options) {
        url = url || "";
        var method = options.method ? options.method.toUpperCase() : "POST";
        var success = options.success || function() {};
        var error = options.error || function() {};
        var async = options.async === undefined ? true : options.async;
        var data = options.data || null;
        var processData = options.processData === undefined ? true : options.processData;
        var headers = options.headers || {};
        var urlParts = fp.util.parseUrl(url);
        var origin = window.location.protocol + "//" + window.location.host;
        var crossdomain = origin !== urlParts.origin;
        var finished = false;
        url += (url.indexOf("?") >= 0 ? "&" : "?") + "plugin=" + fp.urls.getPlugin();
        if (data && processData) {
            data = toQueryString(options.data);
        }
        var xhr;
        if (options.xhr) {
            xhr = options.xhr;
        } else {
            xhr = getXhr();
            if (!xhr) {
                options.error("Ajax not allowed");
                return xhr;
            }
        }
        if (crossdomain && window.XDomainRequest && !("withCredentials" in xhr)) {
            return new XDomainAjax(url, options);
        }
        if (options.progress && xhr.upload) {
            xhr.upload.addEventListener("progress", function(e) {
                if (e.lengthComputable) {
                    options.progress(Math.round(e.loaded * 95 / e.total));
                }
            }, false);
        }
        var onStateChange = function() {
            if (xhr.readyState == 4 && !finished) {
                if (options.progress) {
                    options.progress(100);
                }
                if (xhr.status >= 200 && xhr.status < 300) {
                    var resp = xhr.responseText;
                    if (options.json) {
                        try {
                            resp = fp.json.decode(resp);
                        } catch (e) {
                            onerror.call(xhr, "Invalid json: " + resp);
                            return;
                        }
                    }
                    success(resp, xhr.status, xhr);
                    finished = true;
                } else {
                    onerror.call(xhr, xhr.responseText);
                    finished = true;
                }
            }
        };
        xhr.onreadystatechange = onStateChange;
        var onerror = function(err) {
            if (finished) {
                return;
            }
            if (options.progress) {
                options.progress(100);
            }
            finished = true;
            if (this.status == 400) {
                error("bad_params", this.status, this);
                return;
            } else if (this.status == 403) {
                error("not_authorized", this.status, this);
                return;
            } else if (this.status == 404) {
                error("not_found", this.status, this);
                return;
            }
            if (crossdomain) {
                if (this.readyState == 4 && this.status === 0) {
                    error("CORS_not_allowed", this.status, this);
                    return;
                } else {
                    error("CORS_error", this.status, this);
                    return;
                }
            }
            error(err, this.status, this);
        };
        xhr.onerror = onerror;
        if (data && method == "GET") {
            url += (url.indexOf("?") !== -1 ? "&" : "?") + data;
            data = null;
        }
        xhr.open(method, url, async);
        if (options.json) {
            xhr.setRequestHeader("Accept", "application/json, text/javascript");
        } else {
            xhr.setRequestHeader("Accept", "text/javascript, text/html, application/xml, text/xml, */*");
        }
        var contentType = headers["Content-Type"] || headers["content-type"];
        if (data && processData && (method == "POST" || method == "PUT") && contentType === undefined) {
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
        }
        if (headers) {
            for (var key in headers) {
                xhr.setRequestHeader(key, headers[key]);
            }
        }
        xhr.send(data);
        return xhr;
    };
    var XDomainAjax = function(url, options) {
        if (!window.XDomainRequest) {
            return null;
        }
        var method = options.method ? options.method.toUpperCase() : "POST";
        var success = options.success || function() {};
        var error = options.error || function() {};
        var data = options.data || {};
        if (window.location.protocol == "http:") {
            url = url.replace("https:", "http:");
        } else if (window.location.protocol == "https:") {
            url = url.replace("http:", "https:");
        }
        if (options.async) {
            throw new fp.FilepickerException("Asyncronous Cross-domain requests are not supported");
        }
        if (method !== "GET" && method !== "POST") {
            data._method = method;
            method = "POST";
        }
        if (options.processData !== false) {
            data = data ? toQueryString(data) : null;
        }
        if (data && method == "GET") {
            url += (url.indexOf("?") >= 0 ? "&" : "?") + data;
            data = null;
        }
        url += (url.indexOf("?") >= 0 ? "&" : "?") + "_xdr=true&_cacheBust=" + fp.util.getId();
        var xdr = new window.XDomainRequest();
        xdr.onload = function() {
            var resp = xdr.responseText;
            if (options.progress) {
                options.progress(100);
            }
            if (options.json) {
                try {
                    resp = fp.json.decode(resp);
                } catch (e) {
                    error("Invalid json: " + resp, 200, xdr);
                    return;
                }
            }
            success(resp, 200, xdr);
        };
        xdr.onerror = function() {
            if (options.progress) {
                options.progress(100);
            }
            error(xdr.responseText || "CORS_error", this.status || 500, this);
        };
        xdr.onprogress = function() {};
        xdr.ontimeout = function() {};
        xdr.timeout = 3e4;
        xdr.open(method, url, true);
        xdr.send(data);
        return xdr;
    };
    return {
        get: get_request,
        post: post_request,
        request: make_request
    };
});

"use strict";

filepicker.extend("files", function() {
    var fp = this;
    var readFromFPUrl = function(url, options, onSuccess, onError, onProgress) {
        var temp64 = options.base64encode === undefined;
        if (temp64) {
            options.base64encode = true;
        }
        options.base64encode = options.base64encode !== false;
        var success = function(responseText) {
            if (temp64) {
                responseText = fp.base64.decode(responseText, !!options.asText);
            }
            onSuccess(responseText);
        };
        readFromUrl.call(this, url, options, success, onError, onProgress);
    };
    var readFromUrl = function(url, options, onSuccess, onError, onProgress) {
        if (options.cache !== true) {
            options._cacheBust = fp.util.getId();
        }
        fp.ajax.get(url, {
            data: options,
            headers: {
                "X-NO-STREAM": true
            },
            success: onSuccess,
            error: function(msg, status, xhr) {
                if (msg === "CORS_not_allowed") {
                    onError(new fp.errors.FPError(113));
                } else if (msg === "CORS_error") {
                    onError(new fp.errors.FPError(114));
                } else if (msg === "not_found") {
                    onError(new fp.errors.FPError(115));
                } else if (msg === "bad_params") {
                    onError(new fp.errors.FPError(400));
                } else if (msg === "not_authorized") {
                    onError(new fp.errors.FPError(403));
                } else {
                    onError(new fp.errors.FPError(118));
                }
            },
            progress: onProgress
        });
    };
    var readFromFile = function(file, options, onSuccess, onError, onProgress) {
        if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
            onProgress(10);
            fp.files.storeFile(file, {}, function(fpfile) {
                onProgress(50);
                fp.files.readFromFPUrl(fpfile.url, options, onSuccess, onError, function(progress) {
                    onProgress(50 + progress / 2);
                });
            }, onError, function(progress) {
                onProgress(progress / 2);
            });
            return;
        }
        var base64encode = !!options.base64encode;
        var asText = !!options.asText;
        var reader = new FileReader();
        reader.onprogress = function(evt) {
            if (evt.lengthComputable) {
                onProgress(Math.round(evt.loaded / evt.total * 100));
            }
        };
        reader.onload = function(evt) {
            onProgress(100);
            if (base64encode) {
                onSuccess(fp.base64.encode(evt.target.result, asText));
            } else {
                onSuccess(evt.target.result);
            }
        };
        reader.onerror = function(evt) {
            switch (evt.target.error.code) {
              case evt.target.error.NOT_FOUND_ERR:
                onError(new fp.errors.FPError(115));
                break;

              case evt.target.error.NOT_READABLE_ERR:
                onError(new fp.errors.FPError(116));
                break;

              case evt.target.error.ABORT_ERR:
                onError(new fp.errors.FPError(117));
                break;

              default:
                onError(new fp.errors.FPError(118));
                break;
            }
        };
        if (asText || !reader.readAsBinaryString) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    };
    var writeDataToFPUrl = function(fp_url, input, options, onSuccess, onError, onProgress) {
        var mimetype = options.mimetype || "text/plain";
        fp.ajax.post(fp.urls.constructWriteUrl(fp_url, options), {
            headers: {
                "Content-Type": mimetype
            },
            data: input,
            processData: false,
            json: true,
            success: function(json) {
                onSuccess(fp.util.standardizeFPFile(json));
            },
            error: function(msg, status, xhr) {
                if (msg === "not_found") {
                    onError(new fp.errors.FPError(121));
                } else if (msg === "bad_params") {
                    onError(new fp.errors.FPError(122));
                } else if (msg === "not_authorized") {
                    onError(new fp.errors.FPError(403));
                } else {
                    onError(new fp.errors.FPError(123));
                }
            },
            progress: onProgress
        });
    };
    var writeFileInputToFPUrl = function(fp_url, input, options, onSuccess, onError, onProgress) {
        var error = function(msg, status, xhr) {
            if (msg === "not_found") {
                onError(new fp.errors.FPError(121));
            } else if (msg === "bad_params") {
                onError(new fp.errors.FPError(122));
            } else if (msg === "not_authorized") {
                onError(new fp.errors.FPError(403));
            } else {
                onError(new fp.errors.FPError(123));
            }
        };
        var success = function(json) {
            onSuccess(fp.util.standardizeFPFile(json));
        };
        uploadFile(input, fp.urls.constructWriteUrl(fp_url, options), success, error, onProgress);
    };
    var writeFileToFPUrl = function(fp_url, input, options, onSuccess, onError, onProgress) {
        var error = function(msg, status, xhr) {
            if (msg === "not_found") {
                onError(new fp.errors.FPError(121));
            } else if (msg === "bad_params") {
                onError(new fp.errors.FPError(122));
            } else if (msg === "not_authorized") {
                onError(new fp.errors.FPError(403));
            } else {
                onError(new fp.errors.FPError(123));
            }
        };
        var success = function(json) {
            onSuccess(fp.util.standardizeFPFile(json));
        };
        options.mimetype = input.type;
        uploadFile(input, fp.urls.constructWriteUrl(fp_url, options), success, error, onProgress);
    };
    var writeUrlToFPUrl = function(fp_url, input, options, onSuccess, onError, onProgress) {
        fp.ajax.post(fp.urls.constructWriteUrl(fp_url, options), {
            data: {
                url: input
            },
            json: true,
            success: function(json) {
                onSuccess(fp.util.standardizeFPFile(json));
            },
            error: function(msg, status, xhr) {
                if (msg === "not_found") {
                    onError(new fp.errors.FPError(121));
                } else if (msg === "bad_params") {
                    onError(new fp.errors.FPError(122));
                } else if (msg === "not_authorized") {
                    onError(new fp.errors.FPError(403));
                } else {
                    onError(new fp.errors.FPError(123));
                }
            },
            progress: onProgress
        });
    };
    var storeFileInput = function(input, options, onSuccess, onError, onProgress) {
        if (input.files) {
            if (input.files.length === 0) {
                onError(new fp.errors.FPError(115));
            } else {
                storeFile(input.files[0], options, onSuccess, onError, onProgress);
            }
            return;
        }
        fp.util.setDefault(options, "location", "S3");
        if (!options.filename) {
            options.filename = input.value.replace("C:\\fakepath\\", "") || input.name;
        }
        var old_name = input.name;
        input.name = "fileUpload";
        fp.iframeAjax.post(fp.urls.constructStoreUrl(options), {
            data: input,
            processData: false,
            json: true,
            success: function(json) {
                input.name = old_name;
                onSuccess(fp.util.standardizeFPFile(json));
            },
            error: function(msg, status, xhr) {
                if (msg === "not_found") {
                    onError(new fp.errors.FPError(121));
                } else if (msg === "bad_params") {
                    onError(new fp.errors.FPError(122));
                } else if (msg === "not_authorized") {
                    onError(new fp.errors.FPError(403));
                } else {
                    onError(new fp.errors.FPError(123));
                }
            }
        });
    };
    var storeFile = function(input, options, onSuccess, onError, onProgress) {
        fp.util.setDefault(options, "location", "S3");
        var error = function(msg, status, xhr) {
            if (msg === "not_found") {
                onError(new fp.errors.FPError(121));
            } else if (msg === "bad_params") {
                onError(new fp.errors.FPError(122));
            } else if (msg === "not_authorized") {
                onError(new fp.errors.FPError(403));
            } else {
                fp.util.console.error(msg);
                onError(new fp.errors.FPError(123));
            }
        };
        var success = function(json) {
            onSuccess(fp.util.standardizeFPFile(json));
        };
        if (!options.filename) {
            options.filename = input.name || input.fileName;
        }
        uploadFile(input, fp.urls.constructStoreUrl(options), success, error, onProgress);
    };
    var uploadFile = function(file, url, success, error, progress) {
        if (file.files) {
            file = file.files[0];
        }
        var html5Upload = !!window.FormData && !!window.XMLHttpRequest;
        if (html5Upload) {
            var data = new window.FormData();
            data.append("fileUpload", file);
            fp.ajax.post(url, {
                json: true,
                processData: false,
                data: data,
                success: success,
                error: error,
                progress: progress
            });
        } else {
            fp.iframeAjax.post(url, {
                data: file,
                json: true,
                success: success,
                error: error
            });
        }
    };
    var storeData = function(input, options, onSuccess, onError, onProgress) {
        fp.util.setDefault(options, "location", "S3");
        fp.util.setDefault(options, "mimetype", "text/plain");
        fp.ajax.post(fp.urls.constructStoreUrl(options), {
            headers: {
                "Content-Type": options.mimetype
            },
            data: input,
            processData: false,
            json: true,
            success: function(json) {
                onSuccess(fp.util.standardizeFPFile(json));
            },
            error: function(msg, status, xhr) {
                if (msg === "not_found") {
                    onError(new fp.errors.FPError(121));
                } else if (msg === "bad_params") {
                    onError(new fp.errors.FPError(122));
                } else if (msg === "not_authorized") {
                    onError(new fp.errors.FPError(403));
                } else {
                    onError(new fp.errors.FPError(123));
                }
            },
            progress: onProgress
        });
    };
    var storeUrl = function(input, options, onSuccess, onError, onProgress) {
        fp.util.setDefault(options, "location", "S3");
        fp.ajax.post(fp.urls.constructStoreUrl(options), {
            data: {
                url: fp.util.getFPUrl(input)
            },
            json: true,
            success: function(json) {
                onSuccess(fp.util.standardizeFPFile(json));
            },
            error: function(msg, status, xhr) {
                if (msg === "not_found") {
                    onError(new fp.errors.FPError(151));
                } else if (msg === "bad_params") {
                    onError(new fp.errors.FPError(152));
                } else if (msg === "not_authorized") {
                    onError(new fp.errors.FPError(403));
                } else {
                    onError(new fp.errors.FPError(153));
                }
            },
            progress: onProgress
        });
    };
    var stat = function(fp_url, options, onSuccess, onError) {
        var dateparams = [ "uploaded", "modified", "created" ];
        if (options.cache !== true) {
            options._cacheBust = fp.util.getId();
        }
        fp.ajax.get(fp_url + "/metadata", {
            json: true,
            data: options,
            success: function(metadata) {
                for (var i = 0; i < dateparams.length; i++) {
                    if (metadata[dateparams[i]]) {
                        metadata[dateparams[i]] = new Date(metadata[dateparams[i]]);
                    }
                }
                onSuccess(metadata);
            },
            error: function(msg, status, xhr) {
                if (msg === "not_found") {
                    onError(new fp.errors.FPError(161));
                } else if (msg === "bad_params") {
                    onError(new fp.errors.FPError(400));
                } else if (msg === "not_authorized") {
                    onError(new fp.errors.FPError(403));
                } else {
                    onError(new fp.errors.FPError(162));
                }
            }
        });
    };
    var remove = function(fp_url, options, onSuccess, onError) {
        options.key = fp.apikey;
        fp.ajax.post(fp_url + "/remove", {
            data: options,
            success: function(resp) {
                onSuccess();
            },
            error: function(msg, status, xhr) {
                if (msg === "not_found") {
                    onError(new fp.errors.FPError(171));
                } else if (msg === "bad_params") {
                    onError(new fp.errors.FPError(400));
                } else if (msg === "not_authorized") {
                    onError(new fp.errors.FPError(403));
                } else {
                    onError(new fp.errors.FPError(172));
                }
            }
        });
    };
    return {
        readFromUrl: readFromUrl,
        readFromFile: readFromFile,
        readFromFPUrl: readFromFPUrl,
        writeDataToFPUrl: writeDataToFPUrl,
        writeFileToFPUrl: writeFileToFPUrl,
        writeFileInputToFPUrl: writeFileInputToFPUrl,
        writeUrlToFPUrl: writeUrlToFPUrl,
        storeFileInput: storeFileInput,
        storeFile: storeFile,
        storeUrl: storeUrl,
        storeData: storeData,
        stat: stat,
        remove: remove
    };
});

"use strict";

filepicker.extend("iframeAjax", function() {
    var fp = this;
    var IFRAME_ID = "ajax_iframe";
    var queue = [];
    var running = false;
    var get_request = function(url, options) {
        options.method = "GET";
        make_request(url, options);
    };
    var post_request = function(url, options) {
        options.method = "POST";
        url += (url.indexOf("?") >= 0 ? "&" : "?") + "_cacheBust=" + fp.util.getId();
        make_request(url, options);
    };
    var runQueue = function() {
        if (queue.length > 0) {
            var next = queue.shift();
            make_request(next.url, next.options);
        }
    };
    var make_request = function(url, options) {
        if (running) {
            queue.push({
                url: url,
                options: options
            });
            return;
        }
        url += (url.indexOf("?") >= 0 ? "&" : "?") + "plugin=" + fp.urls.getPlugin() + "&_cacheBust=" + fp.util.getId();
        url += "&Content-Type=text%2Fhtml";
        fp.comm.openChannel();
        var uploadIFrame;
        try {
            uploadIFrame = document.createElement('<iframe name="' + IFRAME_ID + '">');
        } catch (ex) {
            uploadIFrame = document.createElement("iframe");
        }
        uploadIFrame.id = uploadIFrame.name = IFRAME_ID;
        uploadIFrame.style.display = "none";
        var release = function() {
            running = false;
        };
        if (uploadIFrame.attachEvent) {
            uploadIFrame.attachEvent("onload", release);
            uploadIFrame.attachEvent("onerror", release);
        } else {
            uploadIFrame.onerror = uploadIFrame.onload = release;
        }
        uploadIFrame.id = IFRAME_ID;
        uploadIFrame.name = IFRAME_ID;
        uploadIFrame.style.display = "none";
        uploadIFrame.onerror = uploadIFrame.onload = function() {
            running = false;
        };
        document.body.appendChild(uploadIFrame);
        fp.handlers.attach("upload", getReceiveUploadMessage(options));
        var form = document.createElement("form");
        form.method = options.method || "GET";
        form.action = url;
        form.target = IFRAME_ID;
        var data = options.data;
        if (fp.util.isFileInputElement(data) || fp.util.isFile(data)) {
            form.encoding = form.enctype = "multipart/form-data";
        }
        document.body.appendChild(form);
        var input;
        if (fp.util.isFile(data)) {
            var file_input = getInputForFile(data);
            if (!file_input) {
                throw fp.FilepickerException("Couldn't find corresponding file input.");
            }
            data = {
                fileUpload: file_input
            };
        } else if (fp.util.isFileInputElement(data)) {
            input = data;
            data = {};
            data.fileUpload = input;
        } else if (data && fp.util.isElement(data) && data.tagName === "INPUT") {
            input = data;
            data = {};
            data[input.name] = input;
        } else if (options.processData !== false) {
            data = {
                data: data
            };
        }
        data.format = "iframe";
        var input_cache = {};
        for (var key in data) {
            var val = data[key];
            if (fp.util.isElement(val) && val.tagName === "INPUT") {
                input_cache[key] = {
                    par: val.parentNode,
                    sib: val.nextSibling,
                    name: val.name,
                    input: val,
                    focused: val === document.activeElement
                };
                val.name = key;
                form.appendChild(val);
            } else {
                var input_val = document.createElement("input");
                input_val.name = key;
                input_val.value = val;
                form.appendChild(input_val);
            }
        }
        running = true;
        window.setTimeout(function() {
            form.submit();
            for (var cache_key in input_cache) {
                var cache_val = input_cache[cache_key];
                cache_val.par.insertBefore(cache_val.input, cache_val.sib);
                cache_val.input.name = cache_val.name;
                if (cache_val.focused) {
                    cache_val.input.focus();
                }
            }
            form.parentNode.removeChild(form);
        }, 1);
    };
    var getReceiveUploadMessage = function(options) {
        var success = options.success || function() {};
        var error = options.error || function() {};
        var handler = function(data) {
            if (data.type !== "Upload") {
                return;
            }
            running = false;
            var response = data.payload;
            if (response.error) {
                error(response.error);
            } else {
                success(response);
            }
            fp.handlers.detach("upload");
            runQueue();
        };
        return handler;
    };
    var getInputForFile = function(file) {
        var inputs = document.getElementsByTagName("input");
        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[0];
            if (input.type !== "file" || !input.files || !input.files.length) {
                continue;
            }
            for (var j = 0; j < input.files.length; j++) {
                if (input.files[j] === file) {
                    return input;
                }
            }
        }
        return null;
    };
    return {
        get: get_request,
        post: post_request,
        request: make_request
    };
});

"use strict";

filepicker.extend("base64", function() {
    var fp = this;
    var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var encode = function(input, utf8encode) {
        utf8encode = utf8encode || utf8encode === undefined;
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
        if (utf8encode) {
            input = _utf8_encode(input);
        }
        while (i < input.length) {
            chr1 = input.charCodeAt(i);
            chr2 = input.charCodeAt(i + 1);
            chr3 = input.charCodeAt(i + 2);
            i += 3;
            enc1 = chr1 >> 2;
            enc2 = (chr1 & 3) << 4 | chr2 >> 4;
            enc3 = (chr2 & 15) << 2 | chr3 >> 6;
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
        }
        return output;
    };
    var decode = function(input, utf8decode) {
        utf8decode = utf8decode || utf8decode === undefined;
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        while (i < input.length) {
            enc1 = _keyStr.indexOf(input.charAt(i));
            enc2 = _keyStr.indexOf(input.charAt(i + 1));
            enc3 = _keyStr.indexOf(input.charAt(i + 2));
            enc4 = _keyStr.indexOf(input.charAt(i + 3));
            i += 4;
            chr1 = enc1 << 2 | enc2 >> 4;
            chr2 = (enc2 & 15) << 4 | enc3 >> 2;
            chr3 = (enc3 & 3) << 6 | enc4;
            output = output + String.fromCharCode(chr1);
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
        }
        if (utf8decode) {
            output = _utf8_decode(output);
        }
        return output;
    };
    var _utf8_encode = function(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if (c > 127 && c < 2048) {
                utftext += String.fromCharCode(c >> 6 | 192);
                utftext += String.fromCharCode(c & 63 | 128);
            } else {
                utftext += String.fromCharCode(c >> 12 | 224);
                utftext += String.fromCharCode(c >> 6 & 63 | 128);
                utftext += String.fromCharCode(c & 63 | 128);
            }
        }
        return utftext;
    };
    var _utf8_decode = function(utftext) {
        var string = "", i = 0, c = 0, c2 = 0, c3 = 0;
        while (i < utftext.length) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            } else if (c > 191 && c < 224) {
                c2 = utftext.charCodeAt(i + 1);
                string += String.fromCharCode((c & 31) << 6 | c2 & 63);
                i += 2;
            } else {
                c2 = utftext.charCodeAt(i + 1);
                c3 = utftext.charCodeAt(i + 2);
                string += String.fromCharCode((c & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
                i += 3;
            }
        }
        return string;
    };
    return {
        encode: encode,
        decode: decode
    };
}, true);

"use strict";

filepicker.extend("browser", function() {
    var fp = this;
    var isIOS = function() {
        return !!(navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/iPad/i));
    };
    var isAndroid = function() {
        return !!navigator.userAgent.match(/Android/i);
    };
    var getLanguage = function() {
        var language = window.navigator.userLanguage || window.navigator.language;
        if (language === undefined) {
            language = "en";
        }
        language = language.replace("-", "_").toLowerCase();
        return language;
    };
    return {
        getLanguage: getLanguage,
        openInModal: function() {
            return !(isIOS() || isAndroid()) || !!window.navigator.standalone;
        },
        isMobile: function() {
            return isIOS() || isAndroid();
        }
    };
});

"use strict";

filepicker.extend("conversionsUtil", function() {
    var fp = this, CONVERSION_DOMAIN = fp.urls.BASE.replace("www", "process") + "/";
    var parseConversionUrl = function(processUrl) {
        if (!processUrl) {
            return {
                url: null,
                optionsDict: {}
            };
        }
        processUrl = processUrl.replace(CONVERSION_DOMAIN, "");
        var originalUrl = processUrl.substring(processUrl.indexOf("/http") + 1);
        processUrl = processUrl.replace("/" + originalUrl, "");
        var apikey = processUrl.substring(0, processUrl.indexOf("/"));
        processUrl = processUrl.replace(apikey + "/", "");
        var segments = processUrl.split("/"), optionsDict = {}, majorOption, minorOptions, minorOption, i, j;
        for (i in segments) {
            majorOption = segments[i].split("=");
            if (majorOption.length > 1) {
                optionsDict[majorOption[0]] = {};
                minorOptions = majorOption[1].split(",");
                for (j in minorOptions) {
                    minorOption = minorOptions[j].split(":");
                    if (minorOption.length > 1) {
                        optionsDict[majorOption[0]][minorOption[0]] = minorOption[1];
                    }
                }
            } else if (segments[i]) {
                optionsDict[segments[i]] = null;
            }
        }
        return {
            url: originalUrl,
            apikey: apikey,
            optionsDict: optionsDict
        };
    };
    var buildConversionUrl = function(originalUrl, optionsDict, apikey) {
        var conversionUrl = CONVERSION_DOMAIN + apikey, majorOption, minorOption, length;
        optionsDict = optionsDict || {};
        for (majorOption in optionsDict) {
            conversionUrl += "/" + majorOption;
            length = fp.util.objectKeys(optionsDict[majorOption] || {}).length;
            if (length) {
                conversionUrl += "=";
            }
            for (minorOption in optionsDict[majorOption]) {
                conversionUrl += minorOption + ":" + optionsDict[majorOption][minorOption];
                if (--length !== 0) {
                    conversionUrl += ",";
                }
            }
        }
        conversionUrl += "/" + originalUrl;
        return conversionUrl;
    };
    return {
        CONVERSION_DOMAIN: CONVERSION_DOMAIN,
        parseUrl: parseConversionUrl,
        buildUrl: buildConversionUrl
    };
});

"use strict";

filepicker.extend("json", function() {
    var fp = this;
    var special = {
        "\b": "\\b",
        "	": "\\t",
        "\n": "\\n",
        "\f": "\\f",
        "\r": "\\r",
        '"': '\\"',
        "\\": "\\\\"
    };
    var escape = function(chr) {
        return special[chr] || "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).slice(-4);
    };
    var validate = function(string) {
        string = string.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, "");
        return /^[\],:{}\s]*$/.test(string);
    };
    var encode = function(obj) {
        if (window.JSON && window.JSON.stringify) {
            return window.JSON.stringify(obj);
        }
        if (obj && obj.toJSON) {
            obj = obj.toJSON();
        }
        var string = [];
        switch (fp.util.typeOf(obj)) {
          case "string":
            return '"' + obj.replace(/[\x00-\x1f\\"]/g, escape) + '"';

          case "array":
            for (var i = 0; i < obj.length; i++) {
                string.push(encode(obj[i]));
            }
            return "[" + string + "]";

          case "object":
          case "hash":
            var json;
            var key;
            for (key in obj) {
                json = encode(obj[key]);
                if (json) {
                    string.push(encode(key) + ":" + json);
                }
                json = null;
            }
            return "{" + string + "}";

          case "number":
          case "boolean":
            return "" + obj;

          case "null":
            return "null";

          default:
            return "null";
        }
        return null;
    };
    var decode = function(string, secure) {
        if (!string || fp.util.typeOf(string) !== "string") {
            return null;
        }
        if (window.JSON && window.JSON.parse) {
            return window.JSON.parse(string);
        } else {
            if (secure) {
                if (!validate(string)) {
                    throw new Error("JSON could not decode the input; security is enabled and the value is not secure.");
                }
            }
            return eval("(" + string + ")");
        }
    };
    return {
        validate: validate,
        encode: encode,
        stringify: encode,
        decode: decode,
        parse: decode
    };
});

"use strict";

filepicker.extend("util", function() {
    var fp = this;
    var trim = function(string) {
        return string.replace(/^\s+|\s+$/g, "");
    };
    var trimConvert = function(url) {
        return url.replace(/\/convert\b.*/, "");
    };
    var URL_REGEX = /^(http|https)\:.*\/\//i;
    var isUrl = function(string) {
        return !!string.match(URL_REGEX);
    };
    var parseUrl = function(url) {
        if (!url || url.charAt(0) === "/") {
            url = window.location.protocol + "//" + window.location.host + url;
        }
        var a = document.createElement("a");
        a.href = url;
        var host = a.hostname.indexOf(":") === -1 ? a.hostname : a.host;
        var ret = {
            source: url,
            protocol: a.protocol.replace(":", ""),
            host: host,
            port: a.port,
            query: a.search,
            params: function() {
                var ret = {}, seg = a.search.replace(/^\?/, "").split("&"), len = seg.length, i = 0, s;
                for (;i < len; i++) {
                    if (!seg[i]) {
                        continue;
                    }
                    s = seg[i].split("=");
                    ret[s[0]] = s[1];
                }
                return ret;
            }(),
            file: (a.pathname.match(/\/([^\/?#]+)$/i) || [ undefined, "" ])[1],
            hash: a.hash.replace("#", ""),
            path: a.pathname.replace(/^([^\/])/, "/$1"),
            relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [ undefined, "" ])[1],
            segments: a.pathname.replace(/^\//, "").split("/")
        };
        ret.origin = ret.protocol + "://" + ret.host + (ret.port ? ":" + ret.port : "");
        ret.rawUrl = (ret.origin + ret.path).replace("/convert", "");
        return ret;
    };
    var endsWith = function(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    };
    var appendQueryToUrl = function(url, key, value) {
        return url + (url.indexOf("?") >= 0 ? "&" : "?") + key + "=" + value;
    };
    return {
        trim: trim,
        trimConvert: trimConvert,
        parseUrl: parseUrl,
        isUrl: isUrl,
        endsWith: endsWith,
        appendQueryToUrl: appendQueryToUrl
    };
});

"use strict";

filepicker.extend("util", function() {
    var fp = this;
    var isArray = function(o) {
        return o && Object.prototype.toString.call(o) === "[object Array]";
    };
    var isFile = function(o) {
        return o && Object.prototype.toString.call(o) === "[object File]";
    };
    var isElement = function(o) {
        if (typeof window.HTMLElement === "object") {
            return o instanceof window.HTMLElement;
        } else {
            return o && typeof o === "object" && o.nodeType === 1 && typeof o.nodeName === "string";
        }
    };
    var isFileInputElement = function(o) {
        return isElement(o) && o.tagName === "INPUT" && o.type === "file";
    };
    var typeOf = function(value) {
        if (value === null) {
            return "null";
        } else if (isArray(value)) {
            return "array";
        } else if (isFile(value)) {
            return "file";
        }
        return typeof value;
    };
    var getId = function() {
        var d = new Date();
        return d.getTime().toString();
    };
    var setDefault = function(obj, key, def) {
        if (obj[key] === undefined) {
            obj[key] = def;
        }
    };
    var addOnLoad = function(func) {
        if (window.jQuery) {
            window.jQuery(function() {
                func();
            });
        } else {
            var evnt = "load";
            if (window.addEventListener) {
                window.addEventListener(evnt, func, false);
            } else if (window.attachEvent) {
                window.attachEvent("on" + evnt, func);
            } else {
                if (window.onload) {
                    var curr = window.onload;
                    window.onload = function() {
                        curr();
                        func();
                    };
                } else {
                    window.onload = func;
                }
            }
        }
    };
    var isFPUrl = function(url) {
        return typeof url === "string" && url.match(fp.urls.BASE + "/api/file/");
    };
    var isFPUrlCdn = function(url) {
        return typeof url === "string" && url.match("/api/file/");
    };
    var getFPUrl = function(url) {
        if (typeof url === "string") {
            var matched = url.match(/(?:cdn.filestackcontent.com|cdn.filepicker.io)[\S]*\/([\S]{20,})/);
            if (matched && matched.length > 1) {
                return fp.urls.BASE + "/api/file/" + matched[1];
            }
        }
        return url;
    };
    var consoleWrap = function(fn) {
        return function() {
            if (window.console && typeof window.console[fn] === "function") {
                try {
                    window.console[fn].apply(window.console, arguments);
                } catch (e) {
                    window.alert(Array.prototype.join.call(arguments, ","));
                }
            }
        };
    };
    var console = {};
    console.log = consoleWrap("log");
    console.error = consoleWrap("error");
    var clone = function(o) {
        var ret = {};
        for (var key in o) {
            ret[key] = o[key];
        }
        return ret;
    };
    var standardizeFPFile = function(json) {
        var fpfile = {};
        fpfile.url = json.url;
        fpfile.filename = json.filename || json.name;
        fpfile.mimetype = json.mimetype || json.type;
        fpfile.size = json.size;
        fpfile.key = json.key || json.s3_key;
        fpfile.isWriteable = !!(json.isWriteable || json.writeable);
        return fpfile;
    };
    var isCanvasSupported = function() {
        try {
            var elem = document.createElement("canvas");
            return !!(elem.getContext && elem.getContext("2d"));
        } catch (err) {
            return false;
        }
    };
    var extend = function(obj1, obj2) {
        for (var i in obj1) {
            if (obj1.hasOwnProperty(i)) {
                obj2[i] = obj1[i];
            }
        }
        return obj2;
    };
    var checkApiKey = function() {
        if (!fp.apikey) {
            throw new fp.FilepickerException("API Key not found");
        }
    };
    var objectKeys = function(obj) {
        if (typeof Object.keys !== "function") {
            return function(obj) {
                var keys = [];
                for (var i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        keys.push(i);
                    }
                }
                return keys;
            };
        } else {
            return Object.keys(obj);
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
        getFPUrl: getFPUrl,
        isFPUrlCdn: isFPUrlCdn,
        console: console,
        clone: clone,
        standardizeFPFile: standardizeFPFile,
        isCanvasSupported: isCanvasSupported,
        extend: extend,
        checkApiKey: checkApiKey,
        objectKeys: objectKeys
    };
});

"use strict";

filepicker.extend("windowUtils", function() {
    return {
        getWidth: getWidth,
        getHeight: getHeight
    };
    function getWidth() {
        return document.documentElement.clientWidth || document.body && document.body.clientWidth || 1024;
    }
    function getHeight() {
        return document.documentElement.clientHeight || document.body && document.body.clientHeight || 768;
    }
});

"use strict";

filepicker.extend("dragdrop", function() {
    var fp = this;
    var canDragDrop = function() {
        return (!!window.FileReader || navigator.userAgent.indexOf("Safari") >= 0) && "draggable" in document.createElement("span");
    };
    var makeDropPane = function(div, options) {
        var err = "No DOM element found to create drop pane";
        if (!div) {
            throw new fp.FilepickerException(err);
        }
        if (div.jquery) {
            if (div.length === 0) {
                throw new fp.FilepickerException(err);
            }
            div = div[0];
        }
        if (!canDragDrop()) {
            fp.util.console.error("Your browser doesn't support drag-drop functionality");
            return false;
        }
        options = options || {};
        var dragEnter = options.dragEnter || function() {};
        var dragLeave = options.dragLeave || function() {};
        var onStart = options.onStart || function() {};
        var onSuccess = options.onSuccess || function() {};
        var onError = options.onError || function() {};
        var onProgress = options.onProgress || function() {};
        var mimetypes = options.mimetypes;
        if (!mimetypes) {
            if (options.mimetype) {
                mimetypes = [ options.mimetype ];
            } else {
                mimetypes = [ "*/*" ];
            }
        }
        if (fp.util.typeOf(mimetypes) === "string") {
            mimetypes = mimetypes.split(",");
        }
        var extensions = options.extensions;
        if (!extensions) {
            if (options.extension) {
                extensions = [ options.extension ];
            }
        }
        if (fp.util.typeOf(extensions) === "string") {
            extensions = extensions.replace(/ /g, "").split(",");
        }
        if (extensions) {
            for (var i = 0; i < extensions.length; i++) {
                extensions[i] = extensions[i].toLowerCase();
            }
        }
        var store_options = {
            location: options.location,
            path: options.path,
            container: options.container,
            access: options.access,
            policy: options.policy,
            signature: options.signature
        };
        var enabled = function() {
            return div && (div.getAttribute("disabled") || "enabled") !== "disabled";
        };
        div.addEventListener("dragenter", function(e) {
            if (enabled()) {
                dragEnter();
            }
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, false);
        div.addEventListener("dragleave", function(e) {
            if (enabled()) {
                dragLeave();
            }
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, false);
        div.addEventListener("dragover", function(e) {
            e.dataTransfer.dropEffect = "copy";
            e.preventDefault();
            return false;
        }, false);
        div.addEventListener("drop", function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (!enabled()) {
                return false;
            }
            if (isFolderDropped(e)) {
                return false;
            }
            var files = e.dataTransfer.files, imageSrc = getImageSrcDrop(e.dataTransfer);
            if (files.length) {
                uploadDroppedFiles(files);
            } else if (imageSrc) {
                uploadImageSrc(imageSrc);
            } else {
                onError("NoFilesFound", "No files uploaded");
            }
            return false;
        });
        var reenablePane = function() {
            div.setAttribute("disabled", "enabled");
            if (window.$) {
                window.$(div).prop("disabled", false);
            }
        };
        var progresses = {};
        var response = [];
        var getSuccessHandler = function(i, total) {
            return function(fpfile) {
                if (!options.multiple) {
                    onSuccess([ fpfile ]);
                } else {
                    response.push(fpfile);
                    if (response.length === total) {
                        onSuccess(response);
                        response = [];
                        progresses = {};
                    } else {
                        progresses[i] = 100;
                        updateProgress(total);
                    }
                }
                reenablePane();
            };
        };
        var errorHandler = function(err) {
            onError("UploadError", err.toString());
            reenablePane();
        };
        var getProgressHandler = function(i, total) {
            return function(percent) {
                progresses[i] = percent;
                updateProgress(total);
            };
        };
        var updateProgress = function(totalCount) {
            var totalProgress = 0;
            for (var i in progresses) {
                totalProgress += progresses[i];
            }
            var percentage = totalProgress / totalCount;
            onProgress(percentage);
        };
        var verifyUpload = function(files) {
            if (files.length > 0) {
                if (files.length > 1 && !options.multiple) {
                    onError("TooManyFiles", "Only one file at a time");
                    return false;
                }
                if (options.maxFiles > 0 && files.length > options.maxFiles) {
                    onError("TooManyFiles", "Only " + options.maxFiles + " files at a time");
                    return false;
                }
                var found;
                var file;
                var filename;
                for (var i = 0; i < files.length; i++) {
                    found = false;
                    file = files[i];
                    filename = file.name || file.fileName || "Unknown file";
                    for (var j = 0; j < mimetypes.length; j++) {
                        var mimetype = fp.mimetypes.getMimetype(file);
                        found = found || fp.mimetypes.matchesMimetype(mimetype, mimetypes[j]);
                    }
                    if (!found) {
                        onError("WrongType", filename + " isn't the right type of file");
                        return false;
                    }
                    if (extensions) {
                        found = false;
                        for (j = 0; j < extensions.length; j++) {
                            found = found || fp.util.endsWith(filename, extensions[j]);
                        }
                        if (!found) {
                            onError("WrongType", filename + " isn't the right type of file");
                            return false;
                        }
                    }
                    if (file.size && !!options.maxSize && file.size > options.maxSize) {
                        onError("WrongSize", filename + " is too large (" + file.size + " Bytes)");
                        return false;
                    }
                }
                return true;
            } else {
                onError("NoFilesFound", "No files uploaded");
            }
            return false;
        };
        var getImageSrcDrop = function(dataTransfer) {
            var url, matched;
            if (dataTransfer && typeof dataTransfer.getData === "function") {
                url = dataTransfer.getData("text");
                try {
                    url = url || dataTransfer.getData("text/html");
                } catch (e) {
                    fp.util.console.error(e);
                }
                if (url && !fp.util.isUrl(url)) {
                    matched = url.match(/<img.*?src="(.*?)"/i);
                    url = matched && matched.length > 1 ? matched[1] : null;
                }
            }
            return url;
        };
        return true;
        function onSuccessSrcUpload(blob) {
            var successHandlerForOneFile = getSuccessHandler(0, 1);
            var blobToCheck = fp.util.clone(blob);
            blobToCheck.name = blobToCheck.filename;
            if (verifyUpload([ blobToCheck ])) {
                successHandlerForOneFile(blob);
            } else {
                fp.files.remove(blob.url, store_options, function() {}, function() {});
            }
        }
        function uploadDroppedFiles(files) {
            var total = files.length, i;
            if (verifyUpload(files)) {
                onStart(files);
                div.setAttribute("disabled", "disabled");
                for (i = 0; i < files.length; i++) {
                    fp.store(files[i], store_options, getSuccessHandler(i, total), errorHandler, getProgressHandler(i, total));
                }
            }
        }
        function uploadImageSrc(imageSrc) {
            var progressHandlerForOneFile = getProgressHandler(0, 1);
            fp.storeUrl(imageSrc, onSuccessSrcUpload, errorHandler, progressHandlerForOneFile);
        }
        function isFolderDropped(event) {
            var entry, items, i;
            if (event.dataTransfer.items) {
                items = event.dataTransfer.items;
                for (i = 0; i < items.length; i++) {
                    entry = items[i] && items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : undefined;
                    if (entry && !!entry.isDirectory) {
                        onError("WrongType", "Uploading a folder is not allowed");
                        return true;
                    }
                }
            }
            return false;
        }
    };
    return {
        enabled: canDragDrop,
        makeDropPane: makeDropPane
    };
});

"use strict";

filepicker.extend("responsiveImages", function() {
    var fp = this;
    var WINDOW_RESIZE_TIMEOUT = 200;
    var reloadWithDebounce = debounce(function() {
        constructAll();
    }, WINDOW_RESIZE_TIMEOUT);
    return {
        activate: activate,
        deactivate: deactivate,
        update: update,
        setResponsiveOptions: setResponsiveOptions,
        getResponsiveOptions: getResponsiveOptions,
        getElementDims: getElementDims,
        replaceSrc: replaceSrc,
        getCurrentResizeParams: getCurrentResizeParams,
        construct: construct,
        constructParams: constructParams,
        shouldConstruct: shouldConstruct,
        roundWithStep: roundWithStep,
        addWindowResizeEvent: addWindowResizeEvent,
        removeWindowResizeEvent: removeWindowResizeEvent
    };
    function activate() {
        constructAll();
        addWindowResizeEvent(reloadWithDebounce);
    }
    function deactivate() {
        removeWindowResizeEvent(reloadWithDebounce);
    }
    function update(element) {
        if (element !== undefined) {
            if (element.nodeName === "IMG") {
                construct(element);
            } else {
                throw new fp.FilepickerException("Passed object is not an image");
            }
        } else {
            constructAll(true);
        }
    }
    function constructAll(forceConstruct) {
        var responsiveImages = document.querySelectorAll("img[data-fp-src]"), element, i;
        for (i = 0; i < responsiveImages.length; i++) {
            element = responsiveImages[i];
            if (shouldConstruct(element) || forceConstruct === true) {
                construct(element);
            }
        }
    }
    function shouldConstruct(image) {
        var imageSrc = getSrcAttr(image), changeOnResize = getFpOnResizeAttr(image) || getResponsiveOptions().onResize || "all";
        if (!imageSrc || changeOnResize === "all") {
            return true;
        }
        if (changeOnResize === "none") {
            return false;
        }
        var shouldBeEnlarged = getCurrentResizeParams(imageSrc).width < getElementDims(image).width;
        if (shouldBeEnlarged && changeOnResize === "up" || !shouldBeEnlarged && changeOnResize === "down") {
            return true;
        }
        return false;
    }
    function getElementDims(elem) {
        var dims = {};
        if (elem.parentNode === null) {
            dims.width = fp.windowUtils.getWidth();
            dims.height = fp.windowUtils.getWidth();
            return dims;
        }
        if (elem.alt && !elem.fpAltCheck) {
            elem.parentNode.fpAltCheck = true;
            return getElementDims(elem.parentNode);
        }
        dims.width = elem.offsetWidth;
        dims.height = elem.offsetHeight;
        if (!dims.width) {
            return getElementDims(elem.parentNode);
        }
        return dims;
    }
    function replaceSrc(elem, newSrc) {
        var previousSrc = getSrcAttr(elem) || getFpSrcAttr(elem);
        if (previousSrc !== newSrc) {
            elem.src = newSrc;
            if (previousSrc) {
                elem.onerror = function() {
                    elem.src = previousSrc;
                    elem.onerror = null;
                };
            }
        }
    }
    function getFpOnResizeAttr(elem) {
        return elem.getAttribute("data-fp-on-resize");
    }
    function getFpPixelRoundAttr(elem) {
        return elem.getAttribute("data-fp-pixel-round");
    }
    function getSrcAttr(elem) {
        return elem.getAttribute("src");
    }
    function getFpSrcAttr(elem) {
        return elem.getAttribute("data-fp-src");
    }
    function getFpKeyAttr(elem) {
        return elem.getAttribute("data-fp-apikey");
    }
    function getFpSignatureAttr(elem) {
        return elem.getAttribute("data-fp-signature");
    }
    function getFpPolicyAttr(elem) {
        return elem.getAttribute("data-fp-policy");
    }
    function getCurrentResizeParams(url) {
        return fp.conversionsUtil.parseUrl(url).optionsDict.resize || {};
    }
    function construct(elem) {
        var url = getFpSrcAttr(elem) || getSrcAttr(elem), apikey = getFpKeyAttr(elem) || fp.apikey, responsiveOptions = getResponsiveOptions();
        if (!fp.apikey) {
            fp.setKey(apikey);
            fp.util.checkApiKey();
        }
        replaceSrc(elem, fp.conversionsUtil.buildUrl(url, constructParams(elem, responsiveOptions), apikey));
    }
    function constructParams(elem, responsiveOptions) {
        responsiveOptions = responsiveOptions || {};
        var dims = getElementDims(elem), pixelRound = getFpPixelRoundAttr(elem) || responsiveOptions.pixelRound || 10, params = {
            resize: {
                width: roundWithStep(dims.width, pixelRound)
            }
        }, signature = responsiveOptions.signature || getFpSignatureAttr(elem);
        if (signature) {
            params.security = {
                signature: signature,
                policy: responsiveOptions.policy || getFpPolicyAttr(elem)
            };
        }
        return params;
    }
    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            var later = function() {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    function addWindowResizeEvent(onWindowResized) {
        if (window.addEventListener) {
            window.addEventListener("resize", onWindowResized, false);
        } else if (window.attachEvent) {
            window.attachEvent("onresize", onWindowResized);
        }
    }
    function removeWindowResizeEvent(onWindowResized) {
        if (window.removeEventListener) {
            window.removeEventListener("resize", onWindowResized, false);
        } else if (window.detachEvent) {
            window.detachEvent("onresize", onWindowResized);
        }
    }
    function getResponsiveOptions() {
        return fp.responsiveOptions || {};
    }
    function setResponsiveOptions(options) {
        options = options || {};
        if (typeof options !== "object") {
            throw new fp.FilepickerException("Responsive options must be an object.");
        }
        fp.responsiveOptions = options;
    }
    function roundWithStep(value, round) {
        var pixelRounding = round === 0 ? 1 : round;
        return Math.ceil(value / pixelRounding) * pixelRounding;
    }
});

"use strict";

filepicker.extend("widgets", function() {
    var fp = this;
    var setAttrIfExists = function(key, options, attrname, dom) {
        var val = dom.getAttribute(attrname);
        if (val) {
            options[key] = val;
        }
    };
    var fireOnChangeEvent = function(input, fpfiles) {
        var e;
        if (document.createEvent) {
            e = document.createEvent("Event");
            e.initEvent("change", true, false);
            e.fpfile = fpfiles ? fpfiles[0] : undefined;
            e.fpfiles = fpfiles;
            input.dispatchEvent(e);
        } else if (document.createEventObject) {
            e = document.createEventObject("Event");
            e.eventPhase = 2;
            e.currentTarget = e.srcElement = e.target = input;
            e.fpfile = fpfiles ? fpfiles[0] : undefined;
            e.fpfiles = fpfiles;
            input.fireEvent("onchange", e);
        } else if (input.onchange) {
            input.onchange(fpfiles);
        }
    };
    var splitIfExist = function(key, options) {
        if (options[key]) {
            options[key] = options[key].split(",");
        }
    };
    var setAttrIfExistsArray = function(fpoptions, domElement, optionsObj) {
        for (var option in optionsObj) {
            setAttrIfExists(optionsObj[option], fpoptions, option, domElement);
        }
    };
    var constructOptions = function(domElement, mode) {
        mode = mode || "pick";
        var fpoptions = {}, generalOptionsMap = {
            "data-fp-container": "container",
            "data-fp-mimetype": "mimetype",
            "data-fp-extension": "extension",
            "data-fp-openTo": "openTo",
            "data-fp-debug": "debug",
            "data-fp-signature": "signature",
            "data-fp-policy": "policy",
            "data-fp-language": "language",
            "data-fp-background-upload": "backgroundUpload",
            "data-fp-hide": "hide",
            "data-fp-custom-css": "customCss",
            "data-fp-crop-force": "cropForce",
            "data-fp-crop-ratio": "cropRatio",
            "data-fp-crop-dim": "cropDim",
            "data-fp-crop-max": "cropMax",
            "data-fp-crop-min": "cropMin",
            "data-fp-show-close": "showClose",
            "data-fp-conversions": "conversions",
            "data-fp-custom-text": "customText",
            "data-fp-custom-source-container": "customSourceContainer",
            "data-fp-custom-source-path": "customSourcePath"
        }, pickOnlyOptionsMap = {
            "data-fp-mimetypes": "mimetypes",
            "data-fp-extensions": "extensions",
            "data-fp-maxSize": "maxSize",
            "data-fp-maxFiles": "maxFiles",
            "data-fp-store-location": "storeLocation",
            "data-fp-store-path": "storePath",
            "data-fp-store-container": "storeContainer",
            "data-fp-store-region": "storeRegion",
            "data-fp-store-access": "storeAccess",
            "data-fp-image-quality": "imageQuality",
            "data-fp-image-dim": "imageDim",
            "data-fp-image-max": "imageMax",
            "data-fp-image-min": "imageMin"
        }, webcamOptionsMap = {
            "data-fp-video-recording-resolution": "videoRes",
            "data-fp-webcam-dim": "webcamDim",
            "data-fp-video-length": "videoLen",
            "data-fp-audio-length": "audioLen"
        };
        setAttrIfExistsArray(fpoptions, domElement, generalOptionsMap);
        if (mode === "export") {
            setAttrIfExists("suggestedFilename", fpoptions, "data-fp-suggestedFilename", domElement);
        } else if (mode === "pick") {
            setAttrIfExistsArray(fpoptions, domElement, pickOnlyOptionsMap);
            fpoptions.webcam = {};
            setAttrIfExistsArray(fpoptions.webcam, domElement, webcamOptionsMap);
        }
        var services = domElement.getAttribute("data-fp-services");
        if (services) {
            services = services.split(",");
            for (var j = 0; j < services.length; j++) {
                services[j] = fp.services[services[j].replace(" ", "")] || services[j];
            }
            fpoptions.services = services;
        }
        var service = domElement.getAttribute("data-fp-service");
        if (service) {
            fpoptions.service = fp.services[service.replace(" ", "")] || service;
        }
        var arrayToSplit = [ "extensions", "mimetypes", "imageDim", "imageMin", "imageMax", "cropDim", "cropMax", "cropMin", "webcamDim", "conversions" ];
        for (var key in arrayToSplit) {
            splitIfExist(arrayToSplit[key], fpoptions);
        }
        var apikey = domElement.getAttribute("data-fp-apikey");
        if (apikey) {
            fp.setKey(apikey);
        }
        fpoptions.folders = domElement.getAttribute("data-fp-folders") === "true";
        return fpoptions;
    };
    var isMultiple = function(domElement) {
        return domElement.getAttribute("data-fp-multiple") === "true";
    };
    var constructPickWidget = function(domElement) {
        var widget = document.createElement("button");
        widget.setAttribute("type", "button");
        widget.innerHTML = domElement.getAttribute("data-fp-button-text") || "Pick File";
        widget.className = domElement.getAttribute("data-fp-button-class") || domElement.className || "fp__btn";
        domElement.style.display = "none";
        var fpoptions = constructOptions(domElement);
        if (isMultiple(domElement)) {
            widget.onclick = function() {
                widget.blur();
                fp.pickMultiple(fpoptions, function(fpfiles) {
                    var urls = [];
                    for (var j = 0; j < fpfiles.length; j++) {
                        urls.push(fpfiles[j].url);
                    }
                    domElement.value = urls.join();
                    fireOnChangeEvent(domElement, fpfiles);
                });
                return false;
            };
        } else {
            widget.onclick = function() {
                widget.blur();
                fp.pick(fpoptions, function(fpfile) {
                    domElement.value = fpfile.url;
                    fireOnChangeEvent(domElement, [ fpfile ]);
                });
                return false;
            };
        }
        domElement.parentNode.insertBefore(widget, domElement.nextSibling);
    };
    var constructConvertWidget = function(domElement) {
        var url = domElement.getAttribute("data-fp-url");
        if (!url) {
            return true;
        }
        var widget = document.createElement("button");
        widget.setAttribute("type", "button");
        widget.innerHTML = domElement.getAttribute("data-fp-button-text") || "Convert File";
        widget.className = domElement.getAttribute("data-fp-button-class") || domElement.className || "fp__btn";
        domElement.style.display = "none";
        var fpoptions = constructOptions(domElement, "convert");
        widget.onclick = function() {
            widget.blur();
            fp.processImage(url, fpoptions, function(fpfile) {
                domElement.value = fpfile.url;
                fireOnChangeEvent(domElement, [ fpfile ]);
            });
            return false;
        };
        domElement.parentNode.insertBefore(widget, domElement.nextSibling);
    };
    var constructDragWidget = function(domElement) {
        var pane = document.createElement("div");
        pane.className = domElement.getAttribute("data-fp-class") || domElement.className;
        pane.style.padding = "1px";
        domElement.style.display = "none";
        domElement.parentNode.insertBefore(pane, domElement.nextSibling);
        var pickButton = document.createElement("button");
        pickButton.setAttribute("type", "button");
        pickButton.innerHTML = domElement.getAttribute("data-fp-button-text") || "Pick File";
        pickButton.className = domElement.getAttribute("data-fp-button-class") || "fp__btn";
        pane.appendChild(pickButton);
        var dragPane = document.createElement("div");
        setupDragContainer(dragPane);
        dragPane.innerHTML = domElement.getAttribute("data-fp-drag-text") || "Or drop files here";
        dragPane.className = domElement.getAttribute("data-fp-drag-class") || "";
        pane.appendChild(dragPane);
        var fpoptions = constructOptions(domElement), multiple = isMultiple(domElement);
        if (fp.dragdrop.enabled()) {
            setupDropPane(dragPane, multiple, fpoptions, domElement);
        } else {
            dragPane.innerHTML = "&nbsp;";
        }
        if (multiple) {
            dragPane.onclick = pickButton.onclick = function() {
                pickButton.blur();
                fp.pickMultiple(fpoptions, function(fpfiles) {
                    var urls = [];
                    var filenames = [];
                    for (var j = 0; j < fpfiles.length; j++) {
                        urls.push(fpfiles[j].url);
                        filenames.push(fpfiles[j].filename);
                    }
                    domElement.value = urls.join();
                    onFilesUploaded(domElement, dragPane, filenames.join(", "));
                    fireOnChangeEvent(domElement, fpfiles);
                });
                return false;
            };
        } else {
            dragPane.onclick = pickButton.onclick = function() {
                pickButton.blur();
                fp.pick(fpoptions, function(fpfile) {
                    domElement.value = fpfile.url;
                    onFilesUploaded(domElement, dragPane, fpfile.filename);
                    fireOnChangeEvent(domElement, [ fpfile ]);
                });
                return false;
            };
        }
    };
    var onFilesUploaded = function(input, odrag, text) {
        odrag.innerHTML = text;
        odrag.style.padding = "2px 4px";
        odrag.style.cursor = "default";
        odrag.style.width = "";
        var cancel = document.createElement("span");
        cancel.innerHTML = "X";
        cancel.style.borderRadius = "8px";
        cancel.style.fontSize = "14px";
        cancel.style.cssFloat = "right";
        cancel.style.padding = "0 3px";
        cancel.style.color = "#600";
        cancel.style.cursor = "pointer";
        var clickFn = function(e) {
            if (!e) {
                e = window.event;
            }
            e.cancelBubble = true;
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            setupDragContainer(odrag);
            if (!fp.dragdrop.enabled) {
                odrag.innerHTML = "&nbsp;";
            } else {
                odrag.innerHTML = input.getAttribute("data-fp-drag-text") || "Or drop files here";
            }
            input.value = "";
            fireOnChangeEvent(input);
            return false;
        };
        if (cancel.addEventListener) {
            cancel.addEventListener("click", clickFn, false);
        } else if (cancel.attachEvent) {
            cancel.attachEvent("onclick", clickFn);
        }
        odrag.appendChild(cancel);
    };
    var setupDragContainer = function(dragPane) {
        dragPane.style.border = "1px dashed #AAA";
        dragPane.style.display = "inline-block";
        dragPane.style.margin = "0 0 0 4px";
        dragPane.style.borderRadius = "3px";
        dragPane.style.backgroundColor = "#F3F3F3";
        dragPane.style.color = "#333";
        dragPane.style.fontSize = "14px";
        dragPane.style.lineHeight = "22px";
        dragPane.style.padding = "2px 4px";
        dragPane.style.verticalAlign = "middle";
        dragPane.style.cursor = "pointer";
        dragPane.style.overflow = "hidden";
    };
    var setupDropPane = function(odrag, multiple, fpoptions, input) {
        var text = odrag.innerHTML;
        var pbar;
        fp.dragdrop.makeDropPane(odrag, {
            multiple: multiple,
            maxSize: fpoptions.maxSize,
            mimetypes: fpoptions.mimetypes,
            mimetype: fpoptions.mimetype,
            extensions: fpoptions.extensions,
            extension: fpoptions.extension,
            location: fpoptions.storeLocation,
            path: fpoptions.storePath,
            container: fpoptions.storeContainer,
            region: fpoptions.storeRegion,
            access: fpoptions.storeAccess,
            policy: fpoptions.policy,
            signature: fpoptions.signature,
            dragEnter: function() {
                odrag.innerHTML = "Drop to upload";
                odrag.style.backgroundColor = "#E0E0E0";
                odrag.style.border = "1px solid #000";
            },
            dragLeave: function() {
                odrag.innerHTML = text;
                odrag.style.backgroundColor = "#F3F3F3";
                odrag.style.border = "1px dashed #AAA";
            },
            onError: function(type, msg) {
                if (type === "TooManyFiles") {
                    odrag.innerHTML = msg;
                } else if (type === "WrongType") {
                    odrag.innerHTML = msg;
                } else if (type === "NoFilesFound") {
                    odrag.innerHTML = msg;
                } else if (type === "UploadError") {
                    odrag.innerHTML = "Oops! Had trouble uploading.";
                }
            },
            onStart: function(files) {
                pbar = setupProgress(odrag);
            },
            onProgress: function(percentage) {
                if (pbar) {
                    pbar.style.width = percentage + "%";
                }
            },
            onSuccess: function(fpfiles) {
                var vals = [];
                var filenames = [];
                for (var i = 0; i < fpfiles.length; i++) {
                    vals.push(fpfiles[i].url);
                    filenames.push(fpfiles[i].filename);
                }
                input.value = vals.join();
                onFilesUploaded(input, odrag, filenames.join(", "));
                fireOnChangeEvent(input, fpfiles);
            }
        });
    };
    var setupProgress = function(odrag) {
        var pbar = document.createElement("div");
        var height = odrag.offsetHeight - 2;
        pbar.style.height = height + "px";
        pbar.style.backgroundColor = "#0E90D2";
        pbar.style.width = "2%";
        pbar.style.borderRadius = "3px";
        odrag.style.width = odrag.offsetWidth + "px";
        odrag.style.padding = "0";
        odrag.style.border = "1px solid #AAA";
        odrag.style.backgroundColor = "#F3F3F3";
        odrag.style.boxShadow = "inset 0 1px 2px rgba(0, 0, 0, 0.1)";
        odrag.innerHTML = "";
        odrag.appendChild(pbar);
        return pbar;
    };
    var constructExportWidget = function(domElement) {
        domElement.onclick = function() {
            var url = domElement.getAttribute("data-fp-url");
            if (!url) {
                return true;
            }
            var fpoptions = constructOptions(domElement, "export");
            fp.exportFile(url, fpoptions);
            return false;
        };
    };
    var buildWidgets = function() {
        if (document.querySelectorAll) {
            var i;
            var pick_base = document.querySelectorAll('input[type="filepicker"]');
            for (i = 0; i < pick_base.length; i++) {
                constructPickWidget(pick_base[i]);
            }
            var drag_widgets = document.querySelectorAll('input[type="filepicker-dragdrop"]');
            for (i = 0; i < drag_widgets.length; i++) {
                constructDragWidget(drag_widgets[i]);
            }
            var convert_widgets = document.querySelectorAll('input[type="filepicker-convert"]');
            for (i = 0; i < convert_widgets.length; i++) {
                constructConvertWidget(convert_widgets[i]);
            }
            var export_base = [];
            var tmp = document.querySelectorAll("button[data-fp-url]");
            for (i = 0; i < tmp.length; i++) {
                export_base.push(tmp[i]);
            }
            tmp = document.querySelectorAll("a[data-fp-url]");
            for (i = 0; i < tmp.length; i++) {
                export_base.push(tmp[i]);
            }
            tmp = document.querySelectorAll('input[type="button"][data-fp-url]');
            for (i = 0; i < tmp.length; i++) {
                export_base.push(tmp[i]);
            }
            for (i = 0; i < export_base.length; i++) {
                constructExportWidget(export_base[i]);
            }
            var previews = document.querySelectorAll('[type="filepicker-preview"][data-fp-url]');
            for (i = 0; i < previews.length; i++) {
                constructPreview(previews[i]);
            }
            appendStyle();
        }
    };
    var constructWidget = function(base) {
        if (base.jquery) {
            base = base[0];
        }
        var base_type = base.getAttribute("type");
        if (base_type === "filepicker") {
            constructPickWidget(base);
        } else if (base_type === "filepicker-dragdrop") {
            constructDragWidget(base);
        } else if (base_type === "filepicker-preview") {
            constructPreview(base);
        } else if (base.getAttribute("data-fp-src")) {
            fp.responsiveImages.construct(base);
        } else {
            constructExportWidget(base);
        }
    };
    var constructPreview = function(domElement) {
        var url = domElement.getAttribute("data-fp-url"), css = domElement.getAttribute("data-fp-custom-css");
        var url = fp.util.getFPUrl(url);
        if (!url || !fp.util.isFPUrl(url)) {
            return true;
        } else {
            url = url.replace("api/file/", "api/preview/");
        }
        var iframe = document.createElement("iframe");
        if (css) {
            url = fp.util.appendQueryToUrl(url, "css", css);
        }
        iframe.src = url;
        iframe.width = "100%";
        iframe.height = "100%";
        domElement.appendChild(iframe);
    };
    function appendStyle() {
        try {
            var css = '.fp__btn{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:inline-block;height:34px;padding:4px 30px 5px 40px;position:relative;margin-bottom:0;vertical-align:middle;-ms-touch-action:manipulation;touch-action:manipulation;cursor:pointer;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;font-family:"Open Sans", sans-serif;font-size:12px;font-weight:600;line-height:1.42857143;color:#fff;text-align:center;white-space:nowrap;background:#ef4925;background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAVCAYAAABLy77vAAAABGdBTUEAALGPC/xhBQAAAJRJREFUOBHNUcEWgCAIy14fbl9egK5MRarHQS7ocANmOCgWh1gdNERig1CgwPlLxkZuE80ndHlU+4Lda1zz0m01dSKtcz0h7qpQb7WR+HyrqRPxahzwwMqqkEVs6qnv+86NQAbcJlK/X+vMeMe7XcBOYaRzcbItUR7/8QgcykmElQrQPErnmxNxl2yyiwcgEvQUocIJaE6yERwqXDIAAAAASUVORK5CYII=");background-repeat:no-repeat;background-position:15px 6px;border:1px solid transparent;border-radius:17px}.fp__btn:hover{background-color:#d64533}.fp__btn::after{position:absolute;content:"";top:15px;right:14px;width:7px;height:4px;background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAICAYAAAA1BOUGAAAABGdBTUEAALGPC/xhBQAAAGlJREFUCB1j/P//vw4DA4MiEKOD+0xAkatA/AJNBsS/ysTIyPgfyDgHxO+hCkD0Oag4RAhoPDsQm4NoqCIGBiBnAhBjAxNAkkxAvBZNFsQHuQesmxPIOQZVAKI54UZDFYgABbcBsQhMAgDIVGYSqZsn6wAAAABJRU5ErkJggg==");}.fp__btn:hover::after{background-position:0 -4px;}.fp__btn:active,.fp__btn:focus{outline:none}@media only screen and (min--moz-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2 / 1), only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min-device-pixel-ratio: 2){.fp__btn{background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAqCAYAAADbCvnoAAAABGdBTUEAALGPC/xhBQAAAQFJREFUWAntWEESwjAIbBwfHl+upNoRNjKUJhk5kIvZQGG7bHOwPGltgdYtEJedShKyJnLHhEILz1Zi9HCOzFI7FUqFLAWseDgPdfeQ9QZ4b1j53nstnEJJyBqx20NeT1gEMB5uZG6Fzn5lV5UMp1ASQhMjdnvoqjewsYbDjcytEH5lsxULp1AS0sx8nJfVnjganf3NkVlKhVPIfQ9Zb6jF0atK3mNriXwpicPHvIeyr3sTDA53VgpgH8BvMu1ZCCz7ew/7MPwlE4CQJPNnQj2ZX4SYlEPbVpsvKFZ5TOwhcRoUTQiwwhVjArPEqVvRhMCneMXzDk9lwYphIwrZZOihF32oehMAa1qSAAAAAElFTkSuQmCC");background-size:18px 21px}.fp__btn::after{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAQCAYAAAAmlE46AAAABGdBTUEAALGPC/xhBQAAANpJREFUKBWVkU8KglAYxJ/u3HuBwmUX8BqepKN4ka4RguDOVYu2QVCrhIJ6/caekqLiGxi+PzPD58PAWrszxmygD84h7hpePFLy1mEQBJamgvcVYXkqZXTR0LwpJWw0z0Ba6bymDcrI4kkp4EvzCNoVztNKfVATwoOiyx/NDup1SVqPQVBbDDeK3txBb9JuHfhNW3HWjZhDX+SGRAgPHkl5f0+kieBxRVieaPD5LGJ4WghLiwehbkBI4HUirF3S+SYrhhQ2f2H16aR5vMSYwbdjNtYXZ0J7cc70BXnFMHIGznzEAAAAAElFTkSuQmCC");background-size:7px 8px;}}';
            var head = document.head || document.getElementsByTagName("head")[0], style = document.createElement("style");
            style.type = "text/css";
            if (style.styleSheet) {
                style.styleSheet.cssText = css;
            } else {
                style.appendChild(document.createTextNode(css));
            }
            head.appendChild(style);
        } catch (err) {}
    }
    return {
        constructPickWidget: constructPickWidget,
        constructDragWidget: constructDragWidget,
        constructExportWidget: constructExportWidget,
        buildWidgets: buildWidgets,
        constructWidget: constructWidget
    };
});

"use strict";

(function() {
    filepicker.internal(function() {
        var fp = this;
        fp.util.addOnLoad(fp.cookies.checkThirdParty);
        fp.util.addOnLoad(fp.widgets.buildWidgets);
        fp.util.addOnLoad(fp.responsiveImages.activate);
    });
    delete filepicker.internal;
    delete filepicker.extend;
    var queue = filepicker._queue || [];
    var args;
    var len = queue.length;
    if (len) {
        for (var i = 0; i < len; i++) {
            args = queue[i];
            filepicker[args[0]].apply(filepicker, args[1]);
        }
    }
    if (filepicker._queue) {
        delete filepicker._queue;
    }
})();
},{}],3:[function(require,module,exports){
/*
    Module definition for browserify
*/
require('./dist/filepicker');
module.exports = filepicker;

},{"./dist/filepicker":1}]},{},[2,3])(3)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2ZpbGVwaWNrZXIuanMiLCJmaWxlcGlja2VyX2xvYy5qcyIsImluZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3p5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsbnVsbCwiXCJ1c2Ugc3RyaWN0XCI7XG5cbihmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbnRleHQgPSB7fTtcbiAgICAgICAgdmFyIGFkZE9iamVjdFRvID0gZnVuY3Rpb24obmFtZSwgb2JqLCBiYXNlKSB7XG4gICAgICAgICAgICB2YXIgcGF0aCA9IG5hbWUuc3BsaXQoXCIuXCIpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRoLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICghYmFzZVtwYXRoW2ldXSkge1xuICAgICAgICAgICAgICAgICAgICBiYXNlW3BhdGhbaV1dID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJhc2UgPSBiYXNlW3BhdGhbaV1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmogPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIGlmIChvYmouaXNDbGFzcykge1xuICAgICAgICAgICAgICAgICAgICBiYXNlW3BhdGhbaV1dID0gb2JqO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2VbcGF0aFtpXV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmouYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJhc2VbcGF0aFtpXV0gPSBvYmo7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZhciBleHRlbmRPYmplY3QgPSBmdW5jdGlvbihuYW1lLCBvYmosIGlzX3B1YmxpYykge1xuICAgICAgICAgICAgYWRkT2JqZWN0VG8obmFtZSwgb2JqLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChpc19wdWJsaWMpIHtcbiAgICAgICAgICAgICAgICBhZGRPYmplY3RUbyhuYW1lLCBvYmosIHdpbmRvdy5maWxlcGlja2VyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGV4dGVuZCA9IGZ1bmN0aW9uKHBrZywgaW5pdF9mbiwgaXNfcHVibGljKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBrZyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgaXNfcHVibGljID0gaW5pdF9mbjtcbiAgICAgICAgICAgICAgICBpbml0X2ZuID0gcGtnO1xuICAgICAgICAgICAgICAgIHBrZyA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGtnKSB7XG4gICAgICAgICAgICAgICAgcGtnICs9IFwiLlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG9ianMgPSBpbml0X2ZuLmNhbGwoY29udGV4dCk7XG4gICAgICAgICAgICBmb3IgKHZhciBvYmpfbmFtZSBpbiBvYmpzKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5kT2JqZWN0KHBrZyArIG9ial9uYW1lLCBvYmpzW29ial9uYW1lXSwgaXNfcHVibGljKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGludGVybmFsID0gZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgICAgIGZuLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBleHRlbmQ6IGV4dGVuZCxcbiAgICAgICAgICAgIGludGVybmFsOiBpbnRlcm5hbFxuICAgICAgICB9O1xuICAgIH0oKTtcbiAgICBpZiAoIXdpbmRvdy5maWxlcGlja2VyKSB7XG4gICAgICAgIHdpbmRvdy5maWxlcGlja2VyID0gZnA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgYXR0ciBpbiBmcCkge1xuICAgICAgICAgICAgd2luZG93LmZpbGVwaWNrZXJbYXR0cl0gPSBmcFthdHRyXTtcbiAgICAgICAgfVxuICAgIH1cbn0pKCk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImNvbW1cIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgQ09NTV9JRlJBTUVfTkFNRSA9IFwiZmlsZXBpY2tlcl9jb21tX2lmcmFtZVwiO1xuICAgIHZhciBBUElfSUZSQU1FX05BTUUgPSBcImZwYXBpX2NvbW1faWZyYW1lXCI7XG4gICAgdmFyIG9wZW5Db21tSWZyYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh3aW5kb3cuZnJhbWVzW0NPTU1fSUZSQU1FX05BTUVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIG9wZW5Db21tdW5pY2F0aW9uc0NoYW5uZWwoKTtcbiAgICAgICAgICAgIHZhciBjb21tSUZyYW1lO1xuICAgICAgICAgICAgY29tbUlGcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpZnJhbWVcIik7XG4gICAgICAgICAgICBjb21tSUZyYW1lLmlkID0gY29tbUlGcmFtZS5uYW1lID0gQ09NTV9JRlJBTUVfTkFNRTtcbiAgICAgICAgICAgIGNvbW1JRnJhbWUuc3JjID0gZnAudXJscy5DT01NO1xuICAgICAgICAgICAgY29tbUlGcmFtZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNvbW1JRnJhbWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh3aW5kb3cuZnJhbWVzW0FQSV9JRlJBTUVfTkFNRV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgb3BlbkNvbW11bmljYXRpb25zQ2hhbm5lbCgpO1xuICAgICAgICAgICAgdmFyIGFwaUlGcmFtZTtcbiAgICAgICAgICAgIGFwaUlGcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpZnJhbWVcIik7XG4gICAgICAgICAgICBhcGlJRnJhbWUuaWQgPSBhcGlJRnJhbWUubmFtZSA9IEFQSV9JRlJBTUVfTkFNRTtcbiAgICAgICAgICAgIGFwaUlGcmFtZS5zcmMgPSBmcC51cmxzLkFQSV9DT01NO1xuICAgICAgICAgICAgYXBpSUZyYW1lLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYXBpSUZyYW1lKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGNvbW11bmljYXRpb25zSGFuZGxlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5vcmlnaW4gIT09IGZwLnVybHMuQkFTRSAmJiBldmVudC5vcmlnaW4gIT09IGZwLnVybHMuRElBTE9HX0JBU0UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZGF0YSA9IGZwLmpzb24ucGFyc2UoZXZlbnQuZGF0YSk7XG4gICAgICAgIGZwLmhhbmRsZXJzLnJ1bihkYXRhKTtcbiAgICB9O1xuICAgIHZhciBpc09wZW4gPSBmYWxzZTtcbiAgICB2YXIgb3BlbkNvbW11bmljYXRpb25zQ2hhbm5lbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoaXNPcGVuKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpc09wZW4gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNvbW11bmljYXRpb25zSGFuZGxlciwgZmFsc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5hdHRhY2hFdmVudCkge1xuICAgICAgICAgICAgd2luZG93LmF0dGFjaEV2ZW50KFwib25tZXNzYWdlXCIsIGNvbW11bmljYXRpb25zSGFuZGxlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIlVuc3VwcG9ydGVkIGJyb3dzZXJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBkZXN0cm95Q29tbUlmcmFtZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAod2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjb21tdW5pY2F0aW9uc0hhbmRsZXIsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgIHdpbmRvdy5kZXRhY2hFdmVudChcIm9ubWVzc2FnZVwiLCBjb21tdW5pY2F0aW9uc0hhbmRsZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJVbnN1cHBvcnRlZCBicm93c2VyXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNPcGVuKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpc09wZW4gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWZyYW1lcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKENPTU1fSUZSQU1FX05BTUUpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlmcmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmcmFtZXNbaV0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChpZnJhbWVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZGVsZXRlIHdpbmRvdy5mcmFtZXNbQ09NTV9JRlJBTUVfTkFNRV07XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgIHZhciBhcGlfaWZyYW1lcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKEFQSV9JRlJBTUVfTkFNRSk7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYXBpX2lmcmFtZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGFwaV9pZnJhbWVzW2pdLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoYXBpX2lmcmFtZXNbal0pO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBkZWxldGUgd2luZG93LmZyYW1lc1tBUElfSUZSQU1FX05BTUVdO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb3BlbkNoYW5uZWw6IG9wZW5Db21tSWZyYW1lLFxuICAgICAgICBjbG9zZUNoYW5uZWw6IGRlc3Ryb3lDb21tSWZyYW1lXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJjb21tX2ZhbGxiYWNrXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIEZQX0NPTU1fSUZSQU1FX05BTUUgPSBcImZpbGVwaWNrZXJfY29tbV9pZnJhbWVcIjtcbiAgICB2YXIgSE9TVF9DT01NX0lGUkFNRV9OQU1FID0gXCJob3N0X2NvbW1faWZyYW1lXCI7XG4gICAgdmFyIGJhc2VfaG9zdF9sb2NhdGlvbiA9IFwiXCI7XG4gICAgdmFyIGhhc2hfY2hlY2tfaW50ZXJ2YWwgPSAyMDA7XG4gICAgdmFyIG9wZW5Db21tSWZyYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIG9wZW5Ib3N0Q29tbUlmcmFtZSgpO1xuICAgIH07XG4gICAgdmFyIG9wZW5Ib3N0Q29tbUlmcmFtZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAod2luZG93LmZyYW1lc1tIT1NUX0NPTU1fSUZSQU1FX05BTUVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciBob3N0Q29tbUlGcmFtZTtcbiAgICAgICAgICAgIGhvc3RDb21tSUZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgICAgICAgICAgIGhvc3RDb21tSUZyYW1lLmlkID0gaG9zdENvbW1JRnJhbWUubmFtZSA9IEhPU1RfQ09NTV9JRlJBTUVfTkFNRTtcbiAgICAgICAgICAgIGJhc2VfaG9zdF9sb2NhdGlvbiA9IGhvc3RDb21tSUZyYW1lLnNyYyA9IGZwLnVybHMuY29uc3RydWN0SG9zdENvbW1GYWxsYmFjaygpO1xuICAgICAgICAgICAgaG9zdENvbW1JRnJhbWUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgdmFyIG9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGJhc2VfaG9zdF9sb2NhdGlvbiA9IGhvc3RDb21tSUZyYW1lLmNvbnRlbnRXaW5kb3cubG9jYXRpb24uaHJlZjtcbiAgICAgICAgICAgICAgICBvcGVuRlBDb21tSWZyYW1lKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGhvc3RDb21tSUZyYW1lLmF0dGFjaEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaG9zdENvbW1JRnJhbWUuYXR0YWNoRXZlbnQoXCJvbmxvYWRcIiwgb25sb2FkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaG9zdENvbW1JRnJhbWUub25sb2FkID0gb25sb2FkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChob3N0Q29tbUlGcmFtZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBvcGVuRlBDb21tSWZyYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh3aW5kb3cuZnJhbWVzW0ZQX0NPTU1fSUZSQU1FX05BTUVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciBmcENvbW1JRnJhbWU7XG4gICAgICAgICAgICBmcENvbW1JRnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO1xuICAgICAgICAgICAgZnBDb21tSUZyYW1lLmlkID0gZnBDb21tSUZyYW1lLm5hbWUgPSBGUF9DT01NX0lGUkFNRV9OQU1FO1xuICAgICAgICAgICAgZnBDb21tSUZyYW1lLnNyYyA9IGZwLnVybHMuRlBfQ09NTV9GQUxMQkFDSyArIFwiP2hvc3RfdXJsPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGJhc2VfaG9zdF9sb2NhdGlvbik7XG4gICAgICAgICAgICBmcENvbW1JRnJhbWUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChmcENvbW1JRnJhbWUpO1xuICAgICAgICB9XG4gICAgICAgIG9wZW5Db21tdW5pY2F0aW9uc0NoYW5uZWwoKTtcbiAgICB9O1xuICAgIHZhciBpc09wZW4gPSBmYWxzZTtcbiAgICB2YXIgdGltZXI7XG4gICAgdmFyIGxhc3RIYXNoID0gXCJcIjtcbiAgICB2YXIgY2hlY2tIYXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjb21tX2lmcmFtZSA9IHdpbmRvdy5mcmFtZXNbRlBfQ09NTV9JRlJBTUVfTkFNRV07XG4gICAgICAgIGlmICghY29tbV9pZnJhbWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaG9zdF9pZnJhbWUgPSBjb21tX2lmcmFtZS5mcmFtZXNbSE9TVF9DT01NX0lGUkFNRV9OQU1FXTtcbiAgICAgICAgaWYgKCFob3N0X2lmcmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBoYXNoID0gaG9zdF9pZnJhbWUubG9jYXRpb24uaGFzaDtcbiAgICAgICAgaWYgKGhhc2ggJiYgaGFzaC5jaGFyQXQoMCkgPT09IFwiI1wiKSB7XG4gICAgICAgICAgICBoYXNoID0gaGFzaC5zdWJzdHIoMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhc2ggPT09IGxhc3RIYXNoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbGFzdEhhc2ggPSBoYXNoO1xuICAgICAgICBpZiAoIWxhc3RIYXNoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRhdGE7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBkYXRhID0gZnAuanNvbi5wYXJzZShoYXNoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIGZwLmhhbmRsZXJzLnJ1bihkYXRhKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIG9wZW5Db21tdW5pY2F0aW9uc0NoYW5uZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGlzT3Blbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXNPcGVuID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aW1lciA9IHdpbmRvdy5zZXRJbnRlcnZhbChjaGVja0hhc2gsIGhhc2hfY2hlY2tfaW50ZXJ2YWwpO1xuICAgIH07XG4gICAgdmFyIGRlc3Ryb3lDb21tSWZyYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRpbWVyKTtcbiAgICAgICAgaWYgKCFpc09wZW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlzT3BlbiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpZnJhbWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoRlBfQ09NTV9JRlJBTUVfTkFNRSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWZyYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWZyYW1lc1tpXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGlmcmFtZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBkZWxldGUgd2luZG93LmZyYW1lc1tGUF9DT01NX0lGUkFNRV9OQU1FXTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgaWZyYW1lcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKEhPU1RfQ09NTV9JRlJBTUVfTkFNRSk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBpZnJhbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZnJhbWVzW2ldLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoaWZyYW1lc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRlbGV0ZSB3aW5kb3cuZnJhbWVzW0hPU1RfQ09NTV9JRlJBTUVfTkFNRV07XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfTtcbiAgICB2YXIgaXNFbmFibGVkID0gIShcInBvc3RNZXNzYWdlXCIgaW4gd2luZG93KTtcbiAgICB2YXIgc2V0RW5hYmxlZCA9IGZ1bmN0aW9uKGVuYWJsZWQpIHtcbiAgICAgICAgaWYgKGVuYWJsZWQgIT09IGlzRW5hYmxlZCkge1xuICAgICAgICAgICAgaXNFbmFibGVkID0gISFlbmFibGVkO1xuICAgICAgICAgICAgaWYgKGlzRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIGFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIG9sZF9jb21tO1xuICAgIHZhciBhY3RpdmF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBvbGRfY29tbSA9IGZwLmNvbW07XG4gICAgICAgIGZwLmNvbW0gPSB7XG4gICAgICAgICAgICBvcGVuQ2hhbm5lbDogb3BlbkNvbW1JZnJhbWUsXG4gICAgICAgICAgICBjbG9zZUNoYW5uZWw6IGRlc3Ryb3lDb21tSWZyYW1lXG4gICAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgZGVhY3RpdmF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBmcC5jb21tID0gb2xkX2NvbW07XG4gICAgICAgIG9sZF9jb21tID0gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgaWYgKGlzRW5hYmxlZCkge1xuICAgICAgICBhY3RpdmF0ZSgpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBvcGVuQ2hhbm5lbDogb3BlbkNvbW1JZnJhbWUsXG4gICAgICAgIGNsb3NlQ2hhbm5lbDogZGVzdHJveUNvbW1JZnJhbWUsXG4gICAgICAgIGlzRW5hYmxlZDogaXNFbmFibGVkXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJjb29raWVzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIGdldFJlY2VpdmVDb29raWVzTWVzc2FnZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEudHlwZSAhPT0gXCJUaGlyZFBhcnR5Q29va2llc1wiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnAuY29va2llcy5USElSRF9QQVJUWV9DT09LSUVTID0gISFkYXRhLnBheWxvYWQ7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayghIWRhdGEucGF5bG9hZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgIH07XG4gICAgdmFyIGNoZWNrVGhpcmRQYXJ0eSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBoYW5kbGVyID0gZ2V0UmVjZWl2ZUNvb2tpZXNNZXNzYWdlKGNhbGxiYWNrKTtcbiAgICAgICAgZnAuaGFuZGxlcnMuYXR0YWNoKFwiY29va2llc1wiLCBoYW5kbGVyKTtcbiAgICAgICAgZnAuY29tbS5vcGVuQ2hhbm5lbCgpO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY2hlY2tUaGlyZFBhcnR5OiBjaGVja1RoaXJkUGFydHlcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImhhbmRsZXJzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIHN0b3JhZ2UgPSB7fTtcbiAgICB2YXIgYXR0YWNoSGFuZGxlciA9IGZ1bmN0aW9uKGlkLCBoYW5kbGVyKSB7XG4gICAgICAgIGlmIChzdG9yYWdlLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgc3RvcmFnZVtpZF0ucHVzaChoYW5kbGVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0b3JhZ2VbaWRdID0gWyBoYW5kbGVyIF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGhhbmRsZXI7XG4gICAgfTtcbiAgICB2YXIgZGV0YWNoSGFuZGxlciA9IGZ1bmN0aW9uKGlkLCBmbikge1xuICAgICAgICB2YXIgaGFuZGxlcnMgPSBzdG9yYWdlW2lkXTtcbiAgICAgICAgaWYgKCFoYW5kbGVycykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmbikge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBoYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyc1tpXSA9PT0gZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHN0b3JhZ2VbaWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHN0b3JhZ2VbaWRdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgcnVuID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICB2YXIgY2FsbGVySWQgPSBkYXRhLmlkO1xuICAgICAgICBpZiAoc3RvcmFnZS5oYXNPd25Qcm9wZXJ0eShjYWxsZXJJZCkpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVycyA9IHN0b3JhZ2VbY2FsbGVySWRdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBoYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGhhbmRsZXJzW2ldKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgYXR0YWNoOiBhdHRhY2hIYW5kbGVyLFxuICAgICAgICBkZXRhY2g6IGRldGFjaEhhbmRsZXIsXG4gICAgICAgIHJ1bjogcnVuXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJleHBvcnRlclwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBub3JtYWxpemVPcHRpb25zID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgbm9ybWFsaXplID0gZnVuY3Rpb24oc2luZ3VsYXIsIHBsdXJhbCwgZGVmKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9uc1twbHVyYWxdICYmICFmcC51dGlsLmlzQXJyYXkob3B0aW9uc1twbHVyYWxdKSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnNbcGx1cmFsXSA9IFsgb3B0aW9uc1twbHVyYWxdIF07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnNbc2luZ3VsYXJdKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uc1twbHVyYWxdID0gWyBvcHRpb25zW3Npbmd1bGFyXSBdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkZWYpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zW3BsdXJhbF0gPSBkZWY7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChvcHRpb25zLm1pbWV0eXBlICYmIG9wdGlvbnMuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiRXJyb3I6IENhbm5vdCBwYXNzIGluIGJvdGggbWltZXR5cGUgYW5kIGV4dGVuc2lvbiBwYXJhbWV0ZXJzIHRvIHRoZSBleHBvcnQgZnVuY3Rpb25cIik7XG4gICAgICAgIH1cbiAgICAgICAgbm9ybWFsaXplKFwic2VydmljZVwiLCBcInNlcnZpY2VzXCIpO1xuICAgICAgICBpZiAob3B0aW9ucy5zZXJ2aWNlcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHRpb25zLnNlcnZpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlcnZpY2UgPSAoXCJcIiArIG9wdGlvbnMuc2VydmljZXNbaV0pLnJlcGxhY2UoXCIgXCIsIFwiXCIpO1xuICAgICAgICAgICAgICAgIHZhciBzaWQgPSBmcC5zZXJ2aWNlc1tzZXJ2aWNlXTtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnNlcnZpY2VzW2ldID0gc2lkID09PSB1bmRlZmluZWQgPyBzZXJ2aWNlIDogc2lkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRpb25zLm9wZW5Ubykge1xuICAgICAgICAgICAgb3B0aW9ucy5vcGVuVG8gPSBmcC5zZXJ2aWNlc1tvcHRpb25zLm9wZW5Ub10gfHwgb3B0aW9ucy5vcGVuVG87XG4gICAgICAgIH1cbiAgICAgICAgZnAudXRpbC5zZXREZWZhdWx0KG9wdGlvbnMsIFwiY29udGFpbmVyXCIsIGZwLmJyb3dzZXIub3BlbkluTW9kYWwoKSA/IFwibW9kYWxcIiA6IFwid2luZG93XCIpO1xuICAgIH07XG4gICAgdmFyIGdldEV4cG9ydEhhbmRsZXIgPSBmdW5jdGlvbihvblN1Y2Nlc3MsIG9uRXJyb3IpIHtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS50eXBlICE9PSBcImZpbGVwaWNrZXJVcmxcIikge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgZnAudXRpbC5jb25zb2xlLmVycm9yKGRhdGEuZXJyb3IpO1xuICAgICAgICAgICAgICAgIG9uRXJyb3IoZnAuZXJyb3JzLkZQRXJyb3IoMTMyKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBmcGZpbGUgPSB7fTtcbiAgICAgICAgICAgICAgICBmcGZpbGUudXJsID0gZGF0YS5wYXlsb2FkLnVybDtcbiAgICAgICAgICAgICAgICBmcGZpbGUuZmlsZW5hbWUgPSBkYXRhLnBheWxvYWQuZGF0YS5maWxlbmFtZTtcbiAgICAgICAgICAgICAgICBmcGZpbGUubWltZXR5cGUgPSBkYXRhLnBheWxvYWQuZGF0YS50eXBlO1xuICAgICAgICAgICAgICAgIGZwZmlsZS5zaXplID0gZGF0YS5wYXlsb2FkLmRhdGEuc2l6ZTtcbiAgICAgICAgICAgICAgICBmcGZpbGUuY2xpZW50ID0gZGF0YS5wYXlsb2FkLmRhdGEuY2xpZW50O1xuICAgICAgICAgICAgICAgIGZwZmlsZS5pc1dyaXRlYWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKGZwZmlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcC5tb2RhbC5jbG9zZSgpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICB9O1xuICAgIHZhciBjcmVhdGVFeHBvcnRlciA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IpIHtcbiAgICAgICAgbm9ybWFsaXplT3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgdmFyIGFwaSA9IHtcbiAgICAgICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBmcC5tb2RhbC5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAob3B0aW9ucy5kZWJ1Zykge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3Moe1xuICAgICAgICAgICAgICAgICAgICBpZDogMSxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vd3d3LmZpbGVwaWNrZXIuaW8vYXBpL2ZpbGUvLW5CcTJvblRTZW1MQnhsY0JXbjFcIixcbiAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6IFwidGVzdC5wbmdcIixcbiAgICAgICAgICAgICAgICAgICAgbWltZXR5cGU6IFwiaW1hZ2UvcG5nXCIsXG4gICAgICAgICAgICAgICAgICAgIHNpemU6IDU4OTc5LFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQ6IFwiY29tcHV0ZXJcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICByZXR1cm4gYXBpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmcC5jb29raWVzLlRISVJEX1BBUlRZX0NPT0tJRVMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIGFscmVhZHlIYW5kbGVkID0gZmFsc2U7XG4gICAgICAgICAgICBmcC5jb29raWVzLmNoZWNrVGhpcmRQYXJ0eShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFscmVhZHlIYW5kbGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUV4cG9ydGVyKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBhbHJlYWR5SGFuZGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gYXBpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpZCA9IGZwLnV0aWwuZ2V0SWQoKTtcbiAgICAgICAgdmFyIGZpbmlzaGVkID0gZmFsc2U7XG4gICAgICAgIHZhciBvblN1Y2Nlc3NNYXJrID0gZnVuY3Rpb24oZnBmaWxlKSB7XG4gICAgICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG4gICAgICAgICAgICBvblN1Y2Nlc3MoZnBmaWxlKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIG9uRXJyb3JNYXJrID0gZnVuY3Rpb24oZnBlcnJvcikge1xuICAgICAgICAgICAgZmluaXNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgb25FcnJvcihmcGVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIG9uQ2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICghZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgb25FcnJvcihmcC5lcnJvcnMuRlBFcnJvcigxMzEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgZnAud2luZG93Lm9wZW4ob3B0aW9ucy5jb250YWluZXIsIGZwLnVybHMuY29uc3RydWN0RXhwb3J0VXJsKGlucHV0LCBvcHRpb25zLCBpZCksIG9uQ2xvc2UpO1xuICAgICAgICBmcC5oYW5kbGVycy5hdHRhY2goaWQsIGdldEV4cG9ydEhhbmRsZXIob25TdWNjZXNzTWFyaywgb25FcnJvck1hcmspKTtcbiAgICAgICAgcmV0dXJuIGFwaTtcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZUV4cG9ydGVyOiBjcmVhdGVFeHBvcnRlclxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwibW9kYWxcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcywgU0hBREVfTkFNRSA9IFwiZmlsZXBpY2tlcl9zaGFkZVwiLCBXSU5ET1dfQ09OVEFJTkVSX05BTUUgPSBcImZpbGVwaWNrZXJfZGlhbG9nX2NvbnRhaW5lclwiO1xuICAgIHZhciBvcmlnaW5hbEJvZHkgPSBnZXRIdG1sVGFnKCk7XG4gICAgaWYgKG9yaWdpbmFsQm9keSkge1xuICAgICAgICB2YXIgb3JpZ2luYWxPdmVyZmxvdyA9IG9yaWdpbmFsQm9keS5zdHlsZS5vdmVyZmxvdztcbiAgICB9XG4gICAgdmFyIGdlbmVyYXRlTW9kYWwgPSBmdW5jdGlvbihtb2RhbFVybCwgb25DbG9zZSkge1xuICAgICAgICBhcHBlbmRTdHlsZSgpO1xuICAgICAgICB2YXIgc2hhZGUgPSBjcmVhdGVNb2RhbFNoYWRlKG9uQ2xvc2UpLCBjb250YWluZXIgPSBjcmVhdGVNb2RhbENvbnRhaW5lcigpLCBjbG9zZSA9IGNyZWF0ZU1vZGFsQ2xvc2Uob25DbG9zZSksIG1vZGFsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgICAgICAgbW9kYWwubmFtZSA9IGZwLndpbmRvdy5XSU5ET1dfTkFNRTtcbiAgICAgICAgbW9kYWwuaWQgPSBmcC53aW5kb3cuV0lORE9XX05BTUU7XG4gICAgICAgIG1vZGFsLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XG4gICAgICAgIG1vZGFsLnN0eWxlLmhlaWdodCA9IFwiMTAwJVwiO1xuICAgICAgICBtb2RhbC5zdHlsZS5ib3JkZXIgPSBcIm5vbmVcIjtcbiAgICAgICAgbW9kYWwuc3R5bGUucG9zaXRpb24gPSBcInJlbGF0aXZlXCI7XG4gICAgICAgIG1vZGFsLnNldEF0dHJpYnV0ZShcImJvcmRlclwiLCAwKTtcbiAgICAgICAgbW9kYWwuc2V0QXR0cmlidXRlKFwiZnJhbWVib3JkZXJcIiwgMCk7XG4gICAgICAgIG1vZGFsLnNldEF0dHJpYnV0ZShcImZyYW1lQm9yZGVyXCIsIDApO1xuICAgICAgICBtb2RhbC5zZXRBdHRyaWJ1dGUoXCJtYXJnaW53aWR0aFwiLCAwKTtcbiAgICAgICAgbW9kYWwuc2V0QXR0cmlidXRlKFwibWFyZ2luaGVpZ2h0XCIsIDApO1xuICAgICAgICBtb2RhbC5zcmMgPSBtb2RhbFVybDtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG1vZGFsKTtcbiAgICAgICAgc2hhZGUuYXBwZW5kQ2hpbGQoY2xvc2UpO1xuICAgICAgICBzaGFkZS5hcHBlbmRDaGlsZChjb250YWluZXIpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNoYWRlKTtcbiAgICAgICAgdmFyIGJvZHkgPSBnZXRIdG1sVGFnKCk7XG4gICAgICAgIGlmIChib2R5KSB7XG4gICAgICAgICAgICBib2R5LnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbW9kYWw7XG4gICAgfTtcbiAgICB2YXIgY3JlYXRlTW9kYWxTaGFkZSA9IGZ1bmN0aW9uKG9uQ2xvc2UpIHtcbiAgICAgICAgdmFyIHNoYWRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgc2hhZGUuaWQgPSBTSEFERV9OQU1FO1xuICAgICAgICBzaGFkZS5jbGFzc05hbWUgPSBcImZwX19vdmVybGF5XCI7XG4gICAgICAgIHNoYWRlLm9uY2xpY2sgPSBnZXRDbG9zZU1vZGFsKG9uQ2xvc2UpO1xuICAgICAgICByZXR1cm4gc2hhZGU7XG4gICAgfTtcbiAgICB2YXIgY3JlYXRlTW9kYWxDb250YWluZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1vZGFsY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgbW9kYWxjb250YWluZXIuaWQgPSBXSU5ET1dfQ09OVEFJTkVSX05BTUU7XG4gICAgICAgIG1vZGFsY29udGFpbmVyLmNsYXNzTmFtZSA9IFwiZnBfX2NvbnRhaW5lclwiO1xuICAgICAgICByZXR1cm4gbW9kYWxjb250YWluZXI7XG4gICAgfTtcbiAgICB2YXIgY3JlYXRlTW9kYWxDbG9zZSA9IGZ1bmN0aW9uKG9uQ2xvc2UpIHtcbiAgICAgICAgdmFyIGNsb3NlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgY2xvc2UuY2xhc3NOYW1lID0gXCJmcF9fY2xvc2VcIjtcbiAgICAgICAgdmFyIGNsb3NlQW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XG4gICAgICAgIGNsb3NlQW5jaG9yLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiWFwiKSk7XG4gICAgICAgIGNsb3NlLmFwcGVuZENoaWxkKGNsb3NlQW5jaG9yKTtcbiAgICAgICAgY2xvc2VBbmNob3Iub25jbGljayA9IGdldENsb3NlTW9kYWwob25DbG9zZSk7XG4gICAgICAgIGRvY3VtZW50Lm9ua2V5ZG93biA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgZXZ0ID0gZXZ0IHx8IHdpbmRvdy5ldmVudDtcbiAgICAgICAgICAgIGlmIChldnQua2V5Q29kZSA9PT0gMjcpIHtcbiAgICAgICAgICAgICAgICBnZXRDbG9zZU1vZGFsKG9uQ2xvc2UpKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBjbG9zZTtcbiAgICB9O1xuICAgIHZhciBnZXRDbG9zZU1vZGFsID0gZnVuY3Rpb24ob25DbG9zZSwgZm9yY2UpIHtcbiAgICAgICAgZm9yY2UgPSAhIWZvcmNlO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoZnAudXBsb2FkaW5nICYmICFmb3JjZSkge1xuICAgICAgICAgICAgICAgIGlmICghd2luZG93LmNvbmZpcm0oJ1lvdSBhcmUgY3VycmVudGx5IHVwbG9hZGluZy4gSWYgeW91IGNob29zZSBcIk9LXCIsIHRoZSB3aW5kb3cgd2lsbCBjbG9zZSBhbmQgeW91ciB1cGxvYWQgd2lsbCBub3QgZmluaXNoLiBEbyB5b3Ugd2FudCB0byBzdG9wIHVwbG9hZGluZyBhbmQgY2xvc2UgdGhlIHdpbmRvdz8nKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnAudXBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBkb2N1bWVudC5vbmtleWRvd24gPSBudWxsO1xuICAgICAgICAgICAgc2V0T3JpZ2luYWxPdmVyZmxvdygpO1xuICAgICAgICAgICAgdmFyIHNoYWRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU0hBREVfTkFNRSk7XG4gICAgICAgICAgICBpZiAoc2hhZGUpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHNoYWRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChXSU5ET1dfQ09OVEFJTkVSX05BTUUpO1xuICAgICAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoY29udGFpbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHdpbmRvdy5mcmFtZXNbZnAud2luZG93LldJTkRPV19OQU1FXTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICBpZiAob25DbG9zZSkge1xuICAgICAgICAgICAgICAgIG9uQ2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIGhpZGUoKSB7XG4gICAgICAgIHZhciBzaGFkZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFNIQURFX05BTUUpO1xuICAgICAgICBpZiAoc2hhZGUpIHtcbiAgICAgICAgICAgIHNoYWRlLmhpZGRlbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFdJTkRPV19DT05UQUlORVJfTkFNRSk7XG4gICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5oaWRkZW4gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHNldE9yaWdpbmFsT3ZlcmZsb3coKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc2V0T3JpZ2luYWxPdmVyZmxvdygpIHtcbiAgICAgICAgdmFyIGJvZHkgPSBnZXRIdG1sVGFnKCk7XG4gICAgICAgIGlmIChib2R5KSB7XG4gICAgICAgICAgICBib2R5LnN0eWxlLm92ZXJmbG93ID0gb3JpZ2luYWxPdmVyZmxvdztcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBhcHBlbmRTdHlsZSgpIHtcbiAgICAgICAgdmFyIGNzcyA9IFwiLmZwX19vdmVybGF5IHt0b3A6IDA7cmlnaHQ6IDA7Ym90dG9tOiAwO2xlZnQ6IDA7ei1pbmRleDogMTAwMDtiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuOCk7fVwiICsgXCIuZnBfX2Nsb3NlIHt0b3A6IDEwNHB4OyByaWdodDogMTA4cHg7IHdpZHRoOiAzNXB4OyBoZWlnaHQ6IDM1cHg7IHotaW5kZXg6IDIwOyBjdXJzb3I6IHBvaW50ZXJ9XCIgKyBcIkBtZWRpYSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDc2OHB4KSwgc2NyZWVuIGFuZCAobWF4LWhlaWdodDogNTAwcHgpIHsuZnBfX2Nsb3NlIHt0b3A6IDE1cHg7IHJpZ2h0OiAxMnB4O319XCIgKyBcIi5mcF9fY2xvc2UgYSB7dGV4dC1pbmRlbnQ6IC05OTk5cHg7IG92ZXJmbG93OiBoaWRkZW47IGRpc3BsYXk6IGJsb2NrOyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kOiB1cmwoaHR0cHM6Ly9kMXp5aDNzYnhpdHR2Zy5jbG91ZGZyb250Lm5ldC9jbG9zZS5wbmcpIDUwJSA1MCUgbm8tcmVwZWF0O31cIiArIFwiLmZwX19jbG9zZSBhOmhvdmVyIHtiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsMCwwLCAuMDIpOyBvcGFjaXR5OiAuODt9XCIgKyBcIkBtZWRpYSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDc2OHB4KSwgc2NyZWVuIGFuZCAobWF4LWhlaWdodDogNTAwcHgpIHt0b3A6IDE0cHg7IHJpZ2h0OiAxNHB4O31cIiArIFwiLmZwX19jb3B5IHtkaXNwbGF5OiBub25lO31cIiArIFwiLmZwX19jb250YWluZXIgey13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOiB0b3VjaDsgb3ZlcmZsb3c6IGhpZGRlbjsgbWluLWhlaWdodDogMzAwcHg7IHRvcDogMTAwcHg7cmlnaHQ6IDEwMHB4O2JvdHRvbTogMTAwcHg7bGVmdDogMTAwcHg7YmFja2dyb3VuZDogI2VlZTsgYm94LXNpemluZzpjb250ZW50LWJveDsgLXdlYmtpdC1ib3gtc2l6aW5nOmNvbnRlbnQtYm94OyAtbW96LWJveC1zaXppbmc6Y29udGVudC1ib3g7fVwiICsgXCJAbWVkaWEgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA3NjhweCksIHNjcmVlbiBhbmQgKG1heC1oZWlnaHQ6IDUwMHB4KSB7LmZwX19jb3B5IHtib3R0b206IDA7IGxlZnQ6IDA7IHJpZ2h0OiAwOyBoZWlnaHQ6IDIwcHg7IGJhY2tncm91bmQ6ICMzMzM7fX1cIiArIFwiQG1lZGlhIHNjcmVlbiBhbmQgKG1heC13aWR0aDogNzY4cHgpLCBzY3JlZW4gYW5kIChtYXgtaGVpZ2h0OiA1MDBweCkgey5mcF9fY29weSBhIHttYXJnaW4tbGVmdDogNXB4O319XCIgKyBcIkBtZWRpYSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDc2OHB4KSwgc2NyZWVuIGFuZCAobWF4LWhlaWdodDogNTAwcHgpIHsuZnBfX2NvbnRhaW5lciB7dG9wOiAwO3JpZ2h0OiAwO2JvdHRvbTogMDtsZWZ0OiAwO319XCIgKyBcIi5mcF9fb3ZlcmxheSwgLmZwX19jbG9zZSwgLmZwX19jb3B5LCAuZnBfX2NvbnRhaW5lciB7cG9zaXRpb246IGZpeGVkO31cIjtcbiAgICAgICAgdmFyIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXSwgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gICAgICAgIHN0eWxlLnR5cGUgPSBcInRleHQvY3NzXCI7XG4gICAgICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICAgICAgfVxuICAgICAgICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0SHRtbFRhZygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImh0bWxcIilbMF07XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIGNsb3NlTW9kYWwgPSBnZXRDbG9zZU1vZGFsKGZ1bmN0aW9uKCkge30pO1xuICAgIHJldHVybiB7XG4gICAgICAgIGdlbmVyYXRlOiBnZW5lcmF0ZU1vZGFsLFxuICAgICAgICBjbG9zZTogY2xvc2VNb2RhbCxcbiAgICAgICAgaGlkZTogaGlkZVxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwicGlja2VyXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIG5vcm1hbGl6ZU9wdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBub3JtYWxpemUgPSBmdW5jdGlvbihzaW5ndWxhciwgcGx1cmFsLCBkZWYpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zW3BsdXJhbF0pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWZwLnV0aWwuaXNBcnJheShvcHRpb25zW3BsdXJhbF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnNbcGx1cmFsXSA9IFsgb3B0aW9uc1twbHVyYWxdIF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zW3Npbmd1bGFyXSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnNbcGx1cmFsXSA9IFsgb3B0aW9uc1tzaW5ndWxhcl0gXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGVmKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uc1twbHVyYWxdID0gZGVmO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBub3JtYWxpemUoXCJzZXJ2aWNlXCIsIFwic2VydmljZXNcIik7XG4gICAgICAgIG5vcm1hbGl6ZShcIm1pbWV0eXBlXCIsIFwibWltZXR5cGVzXCIpO1xuICAgICAgICBub3JtYWxpemUoXCJleHRlbnNpb25cIiwgXCJleHRlbnNpb25zXCIpO1xuICAgICAgICBpZiAob3B0aW9ucy5zZXJ2aWNlcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHRpb25zLnNlcnZpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlcnZpY2UgPSAoXCJcIiArIG9wdGlvbnMuc2VydmljZXNbaV0pLnJlcGxhY2UoXCIgXCIsIFwiXCIpO1xuICAgICAgICAgICAgICAgIGlmIChmcC5zZXJ2aWNlc1tzZXJ2aWNlXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlcnZpY2UgPSBmcC5zZXJ2aWNlc1tzZXJ2aWNlXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zZXJ2aWNlc1tpXSA9IHNlcnZpY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMubWltZXR5cGVzICYmIG9wdGlvbnMuZXh0ZW5zaW9ucykge1xuICAgICAgICAgICAgdGhyb3cgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkVycm9yOiBDYW5ub3QgcGFzcyBpbiBib3RoIG1pbWV0eXBlIGFuZCBleHRlbnNpb24gcGFyYW1ldGVycyB0byB0aGUgcGljayBmdW5jdGlvblwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9wdGlvbnMubWltZXR5cGVzICYmICFvcHRpb25zLmV4dGVuc2lvbnMpIHtcbiAgICAgICAgICAgIG9wdGlvbnMubWltZXR5cGVzID0gWyBcIiovKlwiIF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMub3BlblRvKSB7XG4gICAgICAgICAgICBvcHRpb25zLm9wZW5UbyA9IGZwLnNlcnZpY2VzW29wdGlvbnMub3BlblRvXSB8fCBvcHRpb25zLm9wZW5UbztcbiAgICAgICAgfVxuICAgICAgICBmcC51dGlsLnNldERlZmF1bHQob3B0aW9ucywgXCJjb250YWluZXJcIiwgZnAuYnJvd3Nlci5vcGVuSW5Nb2RhbCgpID8gXCJtb2RhbFwiIDogXCJ3aW5kb3dcIik7XG4gICAgfTtcbiAgICB2YXIgZ2V0UGlja0hhbmRsZXIgPSBmdW5jdGlvbihvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZmlsdGVyRGF0YVR5cGUoZGF0YSwgb25Qcm9ncmVzcykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcC51cGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgZnAudXRpbC5jb25zb2xlLmVycm9yKGRhdGEuZXJyb3IpO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLmVycm9yLmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihmcC5lcnJvcnMuRlBFcnJvcihkYXRhLmVycm9yLmNvZGUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKGZwLmVycm9ycy5GUEVycm9yKDEwMikpO1xuICAgICAgICAgICAgICAgICAgICBmcC5tb2RhbC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGZwZmlsZSA9IGZwZmlsZUZyb21QYXlsb2FkKGRhdGEucGF5bG9hZCk7XG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKGZwZmlsZSk7XG4gICAgICAgICAgICAgICAgZnAubW9kYWwuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXI7XG4gICAgfTtcbiAgICB2YXIgZ2V0UGlja0ZvbGRlckhhbmRsZXIgPSBmdW5jdGlvbihvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZmlsdGVyRGF0YVR5cGUoZGF0YSwgb25Qcm9ncmVzcykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcC51cGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgZnAudXRpbC5jb25zb2xlLmVycm9yKGRhdGEuZXJyb3IpO1xuICAgICAgICAgICAgICAgIG9uRXJyb3IoZnAuZXJyb3JzLkZQRXJyb3IoMTAyKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEucGF5bG9hZC5kYXRhLnVybCA9IGRhdGEucGF5bG9hZC51cmw7XG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKGRhdGEucGF5bG9hZC5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZwLm1vZGFsLmNsb3NlKCk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgIH07XG4gICAgdmFyIGdldFVwbG9hZGluZ0hhbmRsZXIgPSBmdW5jdGlvbihvblVwbG9hZGluZykge1xuICAgICAgICBvblVwbG9hZGluZyA9IG9uVXBsb2FkaW5nIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEudHlwZSAhPT0gXCJ1cGxvYWRpbmdcIikge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZwLnVwbG9hZGluZyA9ICEhZGF0YS5wYXlsb2FkO1xuICAgICAgICAgICAgb25VcGxvYWRpbmcoZnAudXBsb2FkaW5nKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXI7XG4gICAgfTtcbiAgICB2YXIgYWRkSWZFeGlzdCA9IGZ1bmN0aW9uKGRhdGEsIGZwZmlsZSwga2V5KSB7XG4gICAgICAgIGlmIChkYXRhW2tleV0pIHtcbiAgICAgICAgICAgIGZwZmlsZVtrZXldID0gZGF0YVtrZXldO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgZnBmaWxlRnJvbVBheWxvYWQgPSBmdW5jdGlvbihwYXlsb2FkKSB7XG4gICAgICAgIHZhciBmcGZpbGUgPSB7fTtcbiAgICAgICAgdmFyIHVybCA9IHBheWxvYWQudXJsO1xuICAgICAgICBpZiAodXJsICYmIHVybC51cmwpIHtcbiAgICAgICAgICAgIHVybCA9IHVybC51cmw7XG4gICAgICAgIH1cbiAgICAgICAgZnBmaWxlLnVybCA9IHVybDtcbiAgICAgICAgdmFyIGRhdGEgPSBwYXlsb2FkLnVybC5kYXRhIHx8IHBheWxvYWQuZGF0YTtcbiAgICAgICAgZnBmaWxlLmZpbGVuYW1lID0gZGF0YS5maWxlbmFtZTtcbiAgICAgICAgZnBmaWxlLm1pbWV0eXBlID0gZGF0YS50eXBlO1xuICAgICAgICBmcGZpbGUuc2l6ZSA9IGRhdGEuc2l6ZTtcbiAgICAgICAgaWYgKGRhdGEuY3JvcHBlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBmcGZpbGUuY3JvcHBlZCA9IGRhdGEuY3JvcHBlZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5yb3RhdGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGZwZmlsZS5yb3RhdGVkID0gZGF0YS5yb3RhdGVkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLmNvbnZlcnRlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBmcGZpbGUuY29udmVydGVkID0gZGF0YS5jb252ZXJ0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgYWRkSWZFeGlzdChkYXRhLCBmcGZpbGUsIFwiaWRcIik7XG4gICAgICAgIGFkZElmRXhpc3QoZGF0YSwgZnBmaWxlLCBcImtleVwiKTtcbiAgICAgICAgYWRkSWZFeGlzdChkYXRhLCBmcGZpbGUsIFwiY29udGFpbmVyXCIpO1xuICAgICAgICBhZGRJZkV4aXN0KGRhdGEsIGZwZmlsZSwgXCJwYXRoXCIpO1xuICAgICAgICBhZGRJZkV4aXN0KGRhdGEsIGZwZmlsZSwgXCJjbGllbnRcIik7XG4gICAgICAgIGZwZmlsZS5pc1dyaXRlYWJsZSA9IHRydWU7XG4gICAgICAgIHJldHVybiBmcGZpbGU7XG4gICAgfTtcbiAgICB2YXIgZ2V0UGlja011bHRpcGxlSGFuZGxlciA9IGZ1bmN0aW9uKG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJEYXRhVHlwZShkYXRhLCBvblByb2dyZXNzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZwLnVwbG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKGRhdGEuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBmcC51dGlsLmNvbnNvbGUuZXJyb3IoZGF0YS5lcnJvcik7XG4gICAgICAgICAgICAgICAgb25FcnJvcihmcC5lcnJvcnMuRlBFcnJvcigxMDIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGZwZmlsZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoIWZwLnV0aWwuaXNBcnJheShkYXRhLnBheWxvYWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucGF5bG9hZCA9IFsgZGF0YS5wYXlsb2FkIF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5wYXlsb2FkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmcGZpbGUgPSBmcGZpbGVGcm9tUGF5bG9hZChkYXRhLnBheWxvYWRbaV0pO1xuICAgICAgICAgICAgICAgICAgICBmcGZpbGVzLnB1c2goZnBmaWxlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKGZwZmlsZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnAubW9kYWwuY2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXI7XG4gICAgfTtcbiAgICB2YXIgY3JlYXRlUGlja2VyID0gZnVuY3Rpb24ob3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBtdWx0aXBsZSwgZm9sZGVyLCBvblByb2dyZXNzLCBjb252ZXJ0RmlsZSkge1xuICAgICAgICBub3JtYWxpemVPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICB2YXIgYXBpID0ge1xuICAgICAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGZwLm1vZGFsLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChvcHRpb25zLmRlYnVnKSB7XG4gICAgICAgICAgICB2YXIgZHVteV9kYXRhID0ge1xuICAgICAgICAgICAgICAgIGlkOiAxLFxuICAgICAgICAgICAgICAgIHVybDogXCJodHRwczovL3d3dy5maWxlcGlja2VyLmlvL2FwaS9maWxlLy1uQnEyb25UU2VtTEJ4bGNCV24xXCIsXG4gICAgICAgICAgICAgICAgZmlsZW5hbWU6IFwidGVzdC5wbmdcIixcbiAgICAgICAgICAgICAgICBtaW1ldHlwZTogXCJpbWFnZS9wbmdcIixcbiAgICAgICAgICAgICAgICBzaXplOiA1ODk3OSxcbiAgICAgICAgICAgICAgICBjbGllbnQ6IFwiY29tcHV0ZXJcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBkdW15X2NhbGxiYWNrO1xuICAgICAgICAgICAgaWYgKG11bHRpcGxlIHx8IG9wdGlvbnMuc3RvcmVMb2NhdGlvbikge1xuICAgICAgICAgICAgICAgIGR1bXlfY2FsbGJhY2sgPSBbIGR1bXlfZGF0YSwgZHVteV9kYXRhLCBkdW15X2RhdGEgXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZHVteV9jYWxsYmFjayA9IGR1bXlfZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKGR1bXlfY2FsbGJhY2spO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICByZXR1cm4gYXBpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmcC5jb29raWVzLlRISVJEX1BBUlRZX0NPT0tJRVMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIGFscmVhZHlIYW5kbGVkID0gZmFsc2U7XG4gICAgICAgICAgICBmcC5jb29raWVzLmNoZWNrVGhpcmRQYXJ0eShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFscmVhZHlIYW5kbGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZVBpY2tlcihvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsICEhbXVsdGlwbGUsIGZvbGRlciwgb25Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgICAgIGFscmVhZHlIYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBhcGk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gZnAudXRpbC5nZXRJZCgpO1xuICAgICAgICB2YXIgZmluaXNoZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIG9uU3VjY2Vzc01hcmsgPSBmdW5jdGlvbihmcGZpbGUpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmNvbnRhaW5lciA9PT0gXCJ3aW5kb3dcIikge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG4gICAgICAgICAgICBvblN1Y2Nlc3MoZnBmaWxlKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIG9uRXJyb3JNYXJrID0gZnVuY3Rpb24oZnBlcnJvcikge1xuICAgICAgICAgICAgZmluaXNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgb25FcnJvcihmcGVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIG9uQ2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICghZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgb25FcnJvcihmcC5lcnJvcnMuRlBFcnJvcigxMDEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHVybDtcbiAgICAgICAgdmFyIGhhbmRsZXI7XG4gICAgICAgIGlmIChjb252ZXJ0RmlsZSkge1xuICAgICAgICAgICAgdXJsID0gZnAudXJscy5jb25zdHJ1Y3RDb252ZXJ0VXJsKG9wdGlvbnMsIGlkKTtcbiAgICAgICAgICAgIGhhbmRsZXIgPSBnZXRQaWNrSGFuZGxlcihvblN1Y2Nlc3NNYXJrLCBvbkVycm9yTWFyaywgb25Qcm9ncmVzcyk7XG4gICAgICAgIH0gZWxzZSBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgIHVybCA9IGZwLnVybHMuY29uc3RydWN0UGlja1VybChvcHRpb25zLCBpZCwgdHJ1ZSk7XG4gICAgICAgICAgICBoYW5kbGVyID0gZ2V0UGlja011bHRpcGxlSGFuZGxlcihvblN1Y2Nlc3NNYXJrLCBvbkVycm9yTWFyaywgb25Qcm9ncmVzcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoZm9sZGVyKSB7XG4gICAgICAgICAgICB1cmwgPSBmcC51cmxzLmNvbnN0cnVjdFBpY2tGb2xkZXJVcmwob3B0aW9ucywgaWQpO1xuICAgICAgICAgICAgaGFuZGxlciA9IGdldFBpY2tGb2xkZXJIYW5kbGVyKG9uU3VjY2Vzc01hcmssIG9uRXJyb3JNYXJrLCBvblByb2dyZXNzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVybCA9IGZwLnVybHMuY29uc3RydWN0UGlja1VybChvcHRpb25zLCBpZCwgZmFsc2UpO1xuICAgICAgICAgICAgaGFuZGxlciA9IGdldFBpY2tIYW5kbGVyKG9uU3VjY2Vzc01hcmssIG9uRXJyb3JNYXJrLCBvblByb2dyZXNzKTtcbiAgICAgICAgfVxuICAgICAgICBmcC53aW5kb3cub3BlbihvcHRpb25zLmNvbnRhaW5lciwgdXJsLCBvbkNsb3NlKTtcbiAgICAgICAgZnAuaGFuZGxlcnMuYXR0YWNoKGlkLCBoYW5kbGVyKTtcbiAgICAgICAgdmFyIGtleSA9IGlkICsgXCItdXBsb2FkXCI7XG4gICAgICAgIGZwLmhhbmRsZXJzLmF0dGFjaChrZXksIGdldFVwbG9hZGluZ0hhbmRsZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmcC5oYW5kbGVycy5kZXRhY2goa2V5KTtcbiAgICAgICAgfSkpO1xuICAgICAgICByZXR1cm4gYXBpO1xuICAgIH07XG4gICAgZnVuY3Rpb24gZmlsdGVyRGF0YVR5cGUoZGF0YSwgb25Qcm9ncmVzcykge1xuICAgICAgICBpZiAoZGF0YS50eXBlID09PSBcImZpbGVwaWNrZXJQcm9ncmVzc1wiKSB7XG4gICAgICAgICAgICBmcC51cGxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICBvblByb2dyZXNzKGRhdGEucGF5bG9hZC5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLnR5cGUgPT09IFwibm90VXBsb2FkaW5nXCIpIHtcbiAgICAgICAgICAgIGZwLnVwbG9hZGluZyA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEudHlwZSA9PT0gXCJjbG9zZU1vZGFsXCIpIHtcbiAgICAgICAgICAgIGZwLm1vZGFsLmNsb3NlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS50eXBlID09PSBcImhpZGVNb2RhbFwiKSB7XG4gICAgICAgICAgICBmcC5tb2RhbC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS50eXBlID09PSBcImZpbGVwaWNrZXJVcmxcIiB8fCBkYXRhLnR5cGUgPT09IFwic2VydmVySHR0cEVycm9yXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY3JlYXRlUGlja2VyOiBjcmVhdGVQaWNrZXJcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcIndpbmRvd1wiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBESUFMT0dfVFlQRVMgPSB7XG4gICAgICAgIE9QRU46IFwiL2RpYWxvZy9vcGVuL1wiLFxuICAgICAgICBTQVZFQVM6IFwiL2RpYWxvZy9zYXZlL1wiXG4gICAgfTtcbiAgICB2YXIgV0lORE9XX05BTUUgPSBcImZpbGVwaWNrZXJfZGlhbG9nXCI7XG4gICAgdmFyIFdJTkRPV19QUk9QRVJUSUVTID0gXCJsZWZ0PTEwMCx0b3A9MTAwLGhlaWdodD02MDAsd2lkdGg9ODAwLG1lbnViYXI9bm8sdG9vbGJhcj1ubyxsb2NhdGlvbj1ubyxwZXJzb25hbGJhcj1ubyxzdGF0dXM9bm8scmVzaXphYmxlPXllcyxzY3JvbGxiYXJzPXllcyxkZXBlbmRlbnQ9eWVzLGRpYWxvZz15ZXNcIjtcbiAgICB2YXIgQ0xPU0VfQ0hFQ0tfSU5URVJWQUwgPSAxMDA7XG4gICAgdmFyIG9wZW5XaW5kb3cgPSBmdW5jdGlvbihjb250YWluZXIsIHNyYywgb25DbG9zZSkge1xuICAgICAgICBvbkNsb3NlID0gb25DbG9zZSB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBpZiAoIWNvbnRhaW5lciAmJiBmcC5icm93c2VyLm9wZW5Jbk1vZGFsKCkpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lciA9IFwibW9kYWxcIjtcbiAgICAgICAgfSBlbHNlIGlmICghY29udGFpbmVyKSB7XG4gICAgICAgICAgICBjb250YWluZXIgPSBcIndpbmRvd1wiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250YWluZXIgPT09IFwid2luZG93XCIpIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gV0lORE9XX05BTUUgKyBmcC51dGlsLmdldElkKCk7XG4gICAgICAgICAgICB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBmdW5jdGlvbiBjb25maXJtRXhpdCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJGaWxlcGlja2VyIHVwbG9hZCBkb2VzIG5vdCBjb21wbGV0ZS5cIjtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgd2luID0gd2luZG93Lm9wZW4oc3JjLCBuYW1lLCBXSU5ET1dfUFJPUEVSVElFUyk7XG4gICAgICAgICAgICBpZiAoIXdpbikge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgd2luZG93LmFsZXJ0KFwiUGxlYXNlIGRpc2FibGUgeW91ciBwb3B1cCBibG9ja2VyIHRvIHVwbG9hZCBmaWxlcy5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY2xvc2VDaGVjayA9IHdpbmRvdy5zZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdpbiB8fCB3aW4uY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKGNsb3NlQ2hlY2spO1xuICAgICAgICAgICAgICAgICAgICBvbkNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgQ0xPU0VfQ0hFQ0tfSU5URVJWQUwpO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbnRhaW5lciA9PT0gXCJtb2RhbFwiKSB7XG4gICAgICAgICAgICBmcC5tb2RhbC5nZW5lcmF0ZShzcmMsIG9uQ2xvc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lcl9pZnJhbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjb250YWluZXIpO1xuICAgICAgICAgICAgaWYgKCFjb250YWluZXJfaWZyYW1lKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oJ0NvbnRhaW5lciBcIicgKyBjb250YWluZXIgKyAnXCIgbm90IGZvdW5kLiBUaGlzIHNob3VsZCBlaXRoZXIgYmUgc2V0IHRvIFwid2luZG93XCIsXCJtb2RhbFwiLCBvciB0aGUgSUQgb2YgYW4gaWZyYW1lIHRoYXQgaXMgY3VycmVudGx5IGluIHRoZSBkb2N1bWVudC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRhaW5lcl9pZnJhbWUuc3JjID0gc3JjO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBvcGVuOiBvcGVuV2luZG93LFxuICAgICAgICBXSU5ET1dfTkFNRTogV0lORE9XX05BTUVcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImNvbnZlcnNpb25zXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIHZhbGlkX3BhcmFtZXRlcnMgPSB7XG4gICAgICAgIGFsaWduOiBcInN0cmluZ1wiLFxuICAgICAgICBibHVyQW1vdW50OiBcIm51bWJlclwiLFxuICAgICAgICBjcm9wOiBcInN0cmluZyBvciBhcnJheVwiLFxuICAgICAgICBjcm9wX2ZpcnN0OiBcImJvb2xlYW5cIixcbiAgICAgICAgY29tcHJlc3M6IFwiYm9vbGVhblwiLFxuICAgICAgICBleGlmOiBcInN0cmluZyBvciBib29sZWFuXCIsXG4gICAgICAgIGZpbHRlcjogXCJzdHJpbmdcIixcbiAgICAgICAgZml0OiBcInN0cmluZ1wiLFxuICAgICAgICBmb3JtYXQ6IFwic3RyaW5nXCIsXG4gICAgICAgIGhlaWdodDogXCJudW1iZXJcIixcbiAgICAgICAgcG9saWN5OiBcInN0cmluZ1wiLFxuICAgICAgICBxdWFsaXR5OiBcIm51bWJlclwiLFxuICAgICAgICBwYWdlOiBcIm51bWJlclwiLFxuICAgICAgICByb3RhdGU6IFwic3RyaW5nIG9yIG51bWJlclwiLFxuICAgICAgICBzZWN1cmU6IFwiYm9vbGVhblwiLFxuICAgICAgICBzaGFycGVuQW1vdW50OiBcIm51bWJlclwiLFxuICAgICAgICBzaWduYXR1cmU6IFwic3RyaW5nXCIsXG4gICAgICAgIHN0b3JlQWNjZXNzOiBcInN0cmluZ1wiLFxuICAgICAgICBzdG9yZUNvbnRhaW5lcjogXCJzdHJpbmdcIixcbiAgICAgICAgc3RvcmVSZWdpb246IFwic3RyaW5nXCIsXG4gICAgICAgIHN0b3JlTG9jYXRpb246IFwic3RyaW5nXCIsXG4gICAgICAgIHN0b3JlUGF0aDogXCJzdHJpbmdcIixcbiAgICAgICAgdGV4dDogXCJzdHJpbmdcIixcbiAgICAgICAgdGV4dF9hbGlnbjogXCJzdHJpbmdcIixcbiAgICAgICAgdGV4dF9jb2xvcjogXCJzdHJpbmdcIixcbiAgICAgICAgdGV4dF9mb250OiBcInN0cmluZ1wiLFxuICAgICAgICB0ZXh0X3BhZGRpbmc6IFwibnVtYmVyXCIsXG4gICAgICAgIHRleHRfc2l6ZTogXCJudW1iZXJcIixcbiAgICAgICAgd2F0ZXJtYXJrOiBcInN0cmluZ1wiLFxuICAgICAgICB3YXRlcm1hcmtfcG9zaXRpb246IFwic3RyaW5nXCIsXG4gICAgICAgIHdhdGVybWFya19zaXplOiBcIm51bWJlclwiLFxuICAgICAgICB3aWR0aDogXCJudW1iZXJcIlxuICAgIH07XG4gICAgdmFyIHJlc3RfbWFwID0ge1xuICAgICAgICB3OiBcIndpZHRoXCIsXG4gICAgICAgIGg6IFwiaGVpZ2h0XCJcbiAgICB9O1xuICAgIHZhciBtYXBSZXN0UGFyYW1zID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICBvYmpbcmVzdF9tYXBba2V5XSB8fCBrZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgaWYgKHZhbGlkX3BhcmFtZXRlcnNbcmVzdF9tYXBba2V5XSB8fCBrZXldID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgb2JqW3Jlc3RfbWFwW2tleV0gfHwga2V5XSA9IE51bWJlcihvcHRpb25zW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcbiAgICB2YXIgY2hlY2tQYXJhbWV0ZXJzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgZm91bmQ7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yICh2YXIgdGVzdCBpbiB2YWxpZF9wYXJhbWV0ZXJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gdGVzdCkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWxpZF9wYXJhbWV0ZXJzW3Rlc3RdLmluZGV4T2YoZnAudXRpbC50eXBlT2Yob3B0aW9uc1trZXldKSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkNvbnZlcnNpb24gcGFyYW1ldGVyIFwiICsga2V5ICsgXCIgaXMgbm90IHRoZSByaWdodCB0eXBlOiBcIiArIG9wdGlvbnNba2V5XSArIFwiLiBTaG91bGQgYmUgYSBcIiArIHZhbGlkX3BhcmFtZXRlcnNbdGVzdF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiQ29udmVyc2lvbiBwYXJhbWV0ZXIgXCIgKyBrZXkgKyBcIiBpcyBub3QgYSB2YWxpZCBwYXJhbWV0ZXIuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uKGZwX3VybCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGNoZWNrUGFyYW1ldGVycyhvcHRpb25zKTtcbiAgICAgICAgaWYgKG9wdGlvbnMuY3JvcCAmJiBmcC51dGlsLmlzQXJyYXkob3B0aW9ucy5jcm9wKSkge1xuICAgICAgICAgICAgb3B0aW9ucy5jcm9wID0gb3B0aW9ucy5jcm9wLmpvaW4oXCIsXCIpO1xuICAgICAgICB9XG4gICAgICAgIGZwLmFqYXgucG9zdChmcF91cmwgKyBcIi9jb252ZXJ0XCIsIHtcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMsXG4gICAgICAgICAgICBqc29uOiB0cnVlLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZnBmaWxlKSB7XG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKGZwLnV0aWwuc3RhbmRhcmRpemVGUEZpbGUoZnBmaWxlKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKG1zZywgc3RhdHVzLCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDE0MSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxNDIpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfYXV0aG9yaXplZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDE0MykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9ncmVzczogb25Qcm9ncmVzc1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIGNvbnZlcnQ6IGNvbnZlcnQsXG4gICAgICAgIG1hcFJlc3RQYXJhbXM6IG1hcFJlc3RQYXJhbXNcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImVycm9yc1wiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBGUEVycm9yID0gZnVuY3Rpb24oY29kZSkge1xuICAgICAgICBpZiAodGhpcyA9PT0gd2luZG93KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZQRXJyb3IoY29kZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb2RlID0gY29kZTtcbiAgICAgICAgaWYgKGZpbGVwaWNrZXIuZGVidWcpIHtcbiAgICAgICAgICAgIHZhciBpbmZvID0gZmlsZXBpY2tlci5lcnJvcl9tYXBbdGhpcy5jb2RlXTtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9IGluZm8ubWVzc2FnZTtcbiAgICAgICAgICAgIHRoaXMubW9yZUluZm8gPSBpbmZvLm1vcmVJbmZvO1xuICAgICAgICAgICAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIkZQRXJyb3IgXCIgKyB0aGlzLmNvZGUgKyBcIjogXCIgKyB0aGlzLm1lc3NhZ2UgKyBcIi4gRm9yIGhlbHAsIHNlZSBcIiArIHRoaXMubW9yZUluZm87XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIkZQRXJyb3IgXCIgKyB0aGlzLmNvZGUgKyBcIi4gSW5jbHVkZSBmaWxlcGlja2VyX2RlYnVnLmpzIGZvciBtb3JlIGluZm9cIjtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBGUEVycm9yLmlzQ2xhc3MgPSB0cnVlO1xuICAgIHZhciBoYW5kbGVFcnJvciA9IGZ1bmN0aW9uKGZwZXJyb3IpIHtcbiAgICAgICAgaWYgKGZpbGVwaWNrZXIuZGVidWcpIHtcbiAgICAgICAgICAgIGZwLnV0aWwuY29uc29sZS5lcnJvcihmcGVycm9yLnRvU3RyaW5nKCkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBGUEVycm9yOiBGUEVycm9yLFxuICAgICAgICBoYW5kbGVFcnJvcjogaGFuZGxlRXJyb3JcbiAgICB9O1xufSwgdHJ1ZSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzLCBWRVJTSU9OID0gXCIyLjQuMTFcIjtcbiAgICBmcC5BUElfVkVSU0lPTiA9IFwidjJcIjtcbiAgICB2YXIgc2V0S2V5ID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGZwLmFwaWtleSA9IGtleTtcbiAgICB9O1xuICAgIHZhciBGaWxlcGlja2VyRXhjZXB0aW9uID0gZnVuY3Rpb24odGV4dCkge1xuICAgICAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgICAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJGaWxlcGlja2VyRXhjZXB0aW9uOiBcIiArIHRoaXMudGV4dDtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBGaWxlcGlja2VyRXhjZXB0aW9uLmlzQ2xhc3MgPSB0cnVlO1xuICAgIHZhciBwaWNrID0gZnVuY3Rpb24ob3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGZwLnV0aWwuY2hlY2tBcGlLZXkoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uRXJyb3IgPSBvblN1Y2Nlc3M7XG4gICAgICAgICAgICBvblN1Y2Nlc3MgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBvblN1Y2Nlc3MgPSBvblN1Y2Nlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgb25FcnJvciA9IG9uRXJyb3IgfHwgZnAuZXJyb3JzLmhhbmRsZUVycm9yO1xuICAgICAgICByZXR1cm4gZnAucGlja2VyLmNyZWF0ZVBpY2tlcihvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIGZhbHNlLCBmYWxzZSwgb25Qcm9ncmVzcyk7XG4gICAgfTtcbiAgICB2YXIgcGlja011bHRpcGxlID0gZnVuY3Rpb24ob3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGZwLnV0aWwuY2hlY2tBcGlLZXkoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MgPSBvbkVycm9yO1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIHJldHVybiBmcC5waWNrZXIuY3JlYXRlUGlja2VyKG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgdHJ1ZSwgZmFsc2UsIG9uUHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdmFyIHBpY2tBbmRTdG9yZSA9IGZ1bmN0aW9uKHBpY2tlcl9vcHRpb25zLCBzdG9yZV9vcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgZnAudXRpbC5jaGVja0FwaUtleSgpO1xuICAgICAgICBpZiAoIXBpY2tlcl9vcHRpb25zIHx8ICFzdG9yZV9vcHRpb25zIHx8IHR5cGVvZiBwaWNrZXJfb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiIHx8IHR5cGVvZiBwaWNrZXJfb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIk5vdCBhbGwgcmVxdWlyZWQgcGFyYW1ldGVycyBnaXZlbiwgbWlzc2luZyBwaWNrZXIgb3Igc3RvcmUgb3B0aW9uc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIHZhciBtdWx0aXBsZSA9ICEhcGlja2VyX29wdGlvbnMubXVsdGlwbGU7XG4gICAgICAgIHZhciBvcHRpb25zID0gISFwaWNrZXJfb3B0aW9ucyA/IGZwLnV0aWwuY2xvbmUocGlja2VyX29wdGlvbnMpIDoge307XG4gICAgICAgIG9wdGlvbnMuc3RvcmVMb2NhdGlvbiA9IHN0b3JlX29wdGlvbnMubG9jYXRpb24gfHwgXCJTM1wiO1xuICAgICAgICBvcHRpb25zLnN0b3JlUGF0aCA9IHN0b3JlX29wdGlvbnMucGF0aDtcbiAgICAgICAgb3B0aW9ucy5zdG9yZUNvbnRhaW5lciA9IHN0b3JlX29wdGlvbnMuc3RvcmVDb250YWluZXIgfHwgc3RvcmVfb3B0aW9ucy5jb250YWluZXI7XG4gICAgICAgIG9wdGlvbnMuc3RvcmVSZWdpb24gPSBzdG9yZV9vcHRpb25zLnN0b3JlUmVnaW9uO1xuICAgICAgICBvcHRpb25zLnN0b3JlQWNjZXNzID0gc3RvcmVfb3B0aW9ucy5hY2Nlc3MgfHwgXCJwcml2YXRlXCI7XG4gICAgICAgIGlmIChtdWx0aXBsZSAmJiBvcHRpb25zLnN0b3JlUGF0aCkge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuc3RvcmVQYXRoLmNoYXJBdChvcHRpb25zLnN0b3JlUGF0aC5sZW5ndGggLSAxKSAhPT0gXCIvXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcInBpY2tBbmRTdG9yZSB3aXRoIG11bHRpcGxlIGZpbGVzIHJlcXVpcmVzIGEgcGF0aCB0aGF0IGVuZHMgaW4gXCIgLyBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgc3VjY2VzcyA9IG9uU3VjY2VzcztcbiAgICAgICAgaWYgKCFtdWx0aXBsZSkge1xuICAgICAgICAgICAgc3VjY2VzcyA9IGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoWyByZXNwIF0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnAucGlja2VyLmNyZWF0ZVBpY2tlcihvcHRpb25zLCBzdWNjZXNzLCBvbkVycm9yLCBtdWx0aXBsZSwgZmFsc2UsIG9uUHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdmFyIHBpY2tGb2xkZXIgPSBmdW5jdGlvbihvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgZnAudXRpbC5jaGVja0FwaUtleSgpO1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIHJldHVybiBmcC5waWNrZXIuY3JlYXRlUGlja2VyKG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgZmFsc2UsIHRydWUsIG9uUHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdmFyIHJlYWQgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGZwLnV0aWwuY2hlY2tBcGlLZXkoKTtcbiAgICAgICAgaWYgKCFpbnB1dCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJObyBpbnB1dCBnaXZlbiAtIG5vdGhpbmcgdG8gcmVhZCFcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MgPSBvbkVycm9yO1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIG9uUHJvZ3Jlc3MgPSBvblByb2dyZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGlmIChmcC51dGlsLmlzRlBVcmwoaW5wdXQpKSB7XG4gICAgICAgICAgICAgICAgZnAuZmlsZXMucmVhZEZyb21GUFVybChpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnAuZmlsZXMucmVhZEZyb21VcmwoaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZnAudXRpbC5pc0ZpbGVJbnB1dEVsZW1lbnQoaW5wdXQpKSB7XG4gICAgICAgICAgICBpZiAoIWlucHV0LmZpbGVzKSB7XG4gICAgICAgICAgICAgICAgc3RvcmVUaGVuUmVhZChpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQuZmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTE1KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZwLmZpbGVzLnJlYWRGcm9tRmlsZShpbnB1dC5maWxlc1swXSwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChmcC51dGlsLmlzRmlsZShpbnB1dCkpIHtcbiAgICAgICAgICAgIGZwLmZpbGVzLnJlYWRGcm9tRmlsZShpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dC51cmwpIHtcbiAgICAgICAgICAgIGZwLmZpbGVzLnJlYWRGcm9tRlBVcmwoaW5wdXQudXJsLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJDYW5ub3QgcmVhZCBnaXZlbiBpbnB1dDogXCIgKyBpbnB1dCArIFwiLiBOb3QgYSB1cmwsIGZpbGUgaW5wdXQsIERPTSBGaWxlLCBvciBGUEZpbGUgb2JqZWN0LlwiKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIHN0b3JlVGhlblJlYWQgPSBmdW5jdGlvbihpbnB1dCwgcmVhZE9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBvblByb2dyZXNzKDEwKTtcbiAgICAgICAgZnAuc3RvcmUoaW5wdXQsIGZ1bmN0aW9uKGZwZmlsZSkge1xuICAgICAgICAgICAgb25Qcm9ncmVzcyg1MCk7XG4gICAgICAgICAgICBmcC5yZWFkKGZwZmlsZSwgcmVhZE9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgZnVuY3Rpb24ocHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICBvblByb2dyZXNzKDUwICsgcHJvZ3Jlc3MgLyAyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBvbkVycm9yKTtcbiAgICB9O1xuICAgIHZhciB3cml0ZSA9IGZ1bmN0aW9uKGZwZmlsZSwgaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBmcC51dGlsLmNoZWNrQXBpS2V5KCk7XG4gICAgICAgIGlmICghZnBmaWxlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIk5vIGZwZmlsZSBnaXZlbiAtIG5vdGhpbmcgdG8gd3JpdGUgdG8hXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnB1dCA9PT0gdW5kZWZpbmVkIHx8IGlucHV0ID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIk5vIGlucHV0IGdpdmVuIC0gbm90aGluZyB0byB3cml0ZSFcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MgPSBvbkVycm9yO1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIG9uUHJvZ3Jlc3MgPSBvblByb2dyZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBmcF91cmw7XG4gICAgICAgIGlmIChmcC51dGlsLmlzRlBVcmwoZnAudXRpbC5nZXRGUFVybChmcGZpbGUpKSkge1xuICAgICAgICAgICAgZnBfdXJsID0gZnBmaWxlO1xuICAgICAgICB9IGVsc2UgaWYgKGZwZmlsZS51cmwpIHtcbiAgICAgICAgICAgIGZwX3VybCA9IGZwZmlsZS51cmw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkludmFsaWQgZmlsZSB0byB3cml0ZSB0bzogXCIgKyBmcGZpbGUgKyBcIi4gTm90IGEgZmlsZXBpY2tlciB1cmwgb3IgRlBGaWxlIG9iamVjdC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgZnBfdXJsID0gZnAudXRpbC50cmltQ29udmVydChmcC51dGlsLmdldEZQVXJsKGZwX3VybCkpO1xuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBmcC5maWxlcy53cml0ZURhdGFUb0ZQVXJsKGZwX3VybCwgaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoZnAudXRpbC5pc0ZpbGVJbnB1dEVsZW1lbnQoaW5wdXQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnB1dC5maWxlcykge1xuICAgICAgICAgICAgICAgICAgICBmcC5maWxlcy53cml0ZUZpbGVJbnB1dFRvRlBVcmwoZnBfdXJsLCBpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlucHV0LmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMTUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmcC5maWxlcy53cml0ZUZpbGVUb0ZQVXJsKGZwX3VybCwgaW5wdXQuZmlsZXNbMF0sIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChmcC51dGlsLmlzRmlsZShpbnB1dCkpIHtcbiAgICAgICAgICAgICAgICBmcC5maWxlcy53cml0ZUZpbGVUb0ZQVXJsKGZwX3VybCwgaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlucHV0LnVybCkge1xuICAgICAgICAgICAgICAgIGZwLmZpbGVzLndyaXRlVXJsVG9GUFVybChmcF91cmwsIGlucHV0LnVybCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJDYW5ub3QgcmVhZCBmcm9tIGdpdmVuIGlucHV0OiBcIiArIGlucHV0ICsgXCIuIE5vdCBhIHN0cmluZywgZmlsZSBpbnB1dCwgRE9NIEZpbGUsIG9yIEZQRmlsZSBvYmplY3QuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgd3JpdGVVcmwgPSBmdW5jdGlvbihmcGZpbGUsIGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgZnAudXRpbC5jaGVja0FwaUtleSgpO1xuICAgICAgICBpZiAoIWZwZmlsZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJObyBmcGZpbGUgZ2l2ZW4gLSBub3RoaW5nIHRvIHdyaXRlIHRvIVwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5wdXQgPT09IHVuZGVmaW5lZCB8fCBpbnB1dCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJObyBpbnB1dCBnaXZlbiAtIG5vdGhpbmcgdG8gd3JpdGUhXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBvblByb2dyZXNzID0gb25FcnJvcjtcbiAgICAgICAgICAgIG9uRXJyb3IgPSBvblN1Y2Nlc3M7XG4gICAgICAgICAgICBvblN1Y2Nlc3MgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBvblN1Y2Nlc3MgPSBvblN1Y2Nlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgb25FcnJvciA9IG9uRXJyb3IgfHwgZnAuZXJyb3JzLmhhbmRsZUVycm9yO1xuICAgICAgICBvblByb2dyZXNzID0gb25Qcm9ncmVzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgZnBfdXJsO1xuICAgICAgICBpZiAoZnAudXRpbC5pc0ZQVXJsKGZwLnV0aWwuZ2V0RlBVcmwoZnBmaWxlKSkpIHtcbiAgICAgICAgICAgIGZwX3VybCA9IGZwZmlsZTtcbiAgICAgICAgfSBlbHNlIGlmIChmcGZpbGUudXJsKSB7XG4gICAgICAgICAgICBmcF91cmwgPSBmcGZpbGUudXJsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJJbnZhbGlkIGZpbGUgdG8gd3JpdGUgdG86IFwiICsgZnBmaWxlICsgXCIuIE5vdCBhIGZpbGVwaWNrZXIgdXJsIG9yIEZQRmlsZSBvYmplY3QuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGZwX3VybCA9IGZwLnV0aWwuZ2V0RlBVcmwoZnBfdXJsKTtcbiAgICAgICAgZnAuZmlsZXMud3JpdGVVcmxUb0ZQVXJsKGZwLnV0aWwudHJpbUNvbnZlcnQoZnBfdXJsKSwgaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgfTtcbiAgICB2YXIgZXhwb3J0Rm4gPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yKSB7XG4gICAgICAgIGZwLnV0aWwuY2hlY2tBcGlLZXkoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uRXJyb3IgPSBvblN1Y2Nlc3M7XG4gICAgICAgICAgICBvblN1Y2Nlc3MgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSAhIW9wdGlvbnMgPyBmcC51dGlsLmNsb25lKG9wdGlvbnMpIDoge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIHZhciBmcF91cmw7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09IFwic3RyaW5nXCIgJiYgZnAudXRpbC5pc1VybChpbnB1dCkpIHtcbiAgICAgICAgICAgIGZwX3VybCA9IGlucHV0O1xuICAgICAgICB9IGVsc2UgaWYgKGlucHV0LnVybCkge1xuICAgICAgICAgICAgZnBfdXJsID0gaW5wdXQudXJsO1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zLm1pbWV0eXBlICYmICFvcHRpb25zLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMubWltZXR5cGUgPSBpbnB1dC5taW1ldHlwZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5zdWdnZXN0ZWRGaWxlbmFtZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VnZ2VzdGVkRmlsZW5hbWUgPSBpbnB1dC5maWxlbmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiSW52YWxpZCBmaWxlIHRvIGV4cG9ydDogXCIgKyBpbnB1dCArIFwiLiBOb3QgYSB2YWxpZCB1cmwgb3IgRlBGaWxlIG9iamVjdC4gWW91IG1heSB3YW50IHRvIHVzZSBmaWxlcGlja2VyLnN0b3JlKCkgdG8gZ2V0IGFuIEZQRmlsZSB0byBleHBvcnRcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuc3VnZ2VzdGVkRmlsZW5hbWUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuc3VnZ2VzdGVkRmlsZW5hbWUgPSBlbmNvZGVVUkkob3B0aW9ucy5zdWdnZXN0ZWRGaWxlbmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZwLmV4cG9ydGVyLmNyZWF0ZUV4cG9ydGVyKGZwX3VybCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yKTtcbiAgICB9O1xuICAgIHZhciBwcm9jZXNzSW1hZ2UgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIHZhciBjb252ZXJ0VXJsO1xuICAgICAgICBmcC51dGlsLmNoZWNrQXBpS2V5KCk7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBvbkVycm9yID0gb25TdWNjZXNzO1xuICAgICAgICAgICAgb25TdWNjZXNzID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb25TdWNjZXNzID0gb25TdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIG9uRXJyb3IgPSBvbkVycm9yIHx8IGZwLmVycm9ycy5oYW5kbGVFcnJvcjtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgY29udmVydFVybCA9IGlucHV0O1xuICAgICAgICB9IGVsc2UgaWYgKGlucHV0LnVybCkge1xuICAgICAgICAgICAgY29udmVydFVybCA9IGlucHV0LnVybDtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5maWxlbmFtZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZmlsZW5hbWUgPSBpbnB1dC5maWxlbmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiSW52YWxpZCBmaWxlIHRvIGNvbnZlcnQ6IFwiICsgaW5wdXQgKyBcIi4gTm90IGEgdmFsaWQgdXJsIG9yIEZQRmlsZSBvYmplY3Qgb3Igbm90IGZpbGVwaWNrZXIgdXJsLiBZb3UgY2FuIGNvbnZlcnQgb25seSBmaWxlcGlja2VyIHVybCBpbWFnZXMuXCIpO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMuY29udmVydFVybCA9IGNvbnZlcnRVcmw7XG4gICAgICAgIG9wdGlvbnMubXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgb3B0aW9ucy5zZXJ2aWNlcyA9IFsgXCJDT05WRVJUXCIsIFwiQ09NUFVURVJcIiBdO1xuICAgICAgICBvcHRpb25zLmJhY2tncm91bmRVcGxvYWQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmhpZGUgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGZwLnBpY2tlci5jcmVhdGVQaWNrZXIob3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBmYWxzZSwgZmFsc2UsIG9uUHJvZ3Jlc3MsIHRydWUpO1xuICAgIH07XG4gICAgdmFyIHN0b3JlID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBmcC51dGlsLmNoZWNrQXBpS2V5KCk7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBvblByb2dyZXNzID0gb25FcnJvcjtcbiAgICAgICAgICAgIG9uRXJyb3IgPSBvblN1Y2Nlc3M7XG4gICAgICAgICAgICBvblN1Y2Nlc3MgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSAhIW9wdGlvbnMgPyBmcC51dGlsLmNsb25lKG9wdGlvbnMpIDoge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIG9uUHJvZ3Jlc3MgPSBvblByb2dyZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGZwLmZpbGVzLnN0b3JlRGF0YShpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChmcC51dGlsLmlzRmlsZUlucHV0RWxlbWVudChpbnB1dCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlucHV0LmZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGZwLmZpbGVzLnN0b3JlRmlsZUlucHV0KGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQuZmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDExNSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZwLmZpbGVzLnN0b3JlRmlsZShpbnB1dC5maWxlc1swXSwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZwLnV0aWwuaXNGaWxlKGlucHV0KSkge1xuICAgICAgICAgICAgICAgIGZwLmZpbGVzLnN0b3JlRmlsZShpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQudXJsKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zLmZpbGVuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZmlsZW5hbWUgPSBpbnB1dC5maWxlbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnAuZmlsZXMuc3RvcmVVcmwoaW5wdXQudXJsLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkNhbm5vdCBzdG9yZSBnaXZlbiBpbnB1dDogXCIgKyBpbnB1dCArIFwiLiBOb3QgYSBzdHJpbmcsIGZpbGUgaW5wdXQsIERPTSBGaWxlLCBvciBGUEZpbGUgb2JqZWN0LlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIHN0b3JlVXJsID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBmcC51dGlsLmNoZWNrQXBpS2V5KCk7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBvblByb2dyZXNzID0gb25FcnJvcjtcbiAgICAgICAgICAgIG9uRXJyb3IgPSBvblN1Y2Nlc3M7XG4gICAgICAgICAgICBvblN1Y2Nlc3MgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBvblN1Y2Nlc3MgPSBvblN1Y2Nlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgb25FcnJvciA9IG9uRXJyb3IgfHwgZnAuZXJyb3JzLmhhbmRsZUVycm9yO1xuICAgICAgICBvblByb2dyZXNzID0gb25Qcm9ncmVzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBmcC5maWxlcy5zdG9yZVVybChpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICB9O1xuICAgIHZhciBzdGF0ID0gZnVuY3Rpb24oZnBmaWxlLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IpIHtcbiAgICAgICAgZnAudXRpbC5jaGVja0FwaUtleSgpO1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIHZhciBmcF91cmw7XG4gICAgICAgIGlmIChmcC51dGlsLmlzRlBVcmwoZnAudXRpbC5nZXRGUFVybChmcGZpbGUpKSkge1xuICAgICAgICAgICAgZnBfdXJsID0gZnBmaWxlO1xuICAgICAgICB9IGVsc2UgaWYgKGZwZmlsZS51cmwpIHtcbiAgICAgICAgICAgIGZwX3VybCA9IGZwZmlsZS51cmw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkludmFsaWQgZmlsZSB0byBnZXQgbWV0YWRhdGEgZm9yOiBcIiArIGZwZmlsZSArIFwiLiBOb3QgYSBmaWxlcGlja2VyIHVybCBvciBGUEZpbGUgb2JqZWN0LlwiKTtcbiAgICAgICAgfVxuICAgICAgICBmcF91cmwgPSBmcC51dGlsLmdldEZQVXJsKGZwX3VybCk7XG4gICAgICAgIGZwLmZpbGVzLnN0YXQoZnAudXRpbC50cmltQ29udmVydChmcF91cmwpLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IpO1xuICAgIH07XG4gICAgdmFyIHJlbW92ZSA9IGZ1bmN0aW9uKGZwZmlsZSwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yKSB7XG4gICAgICAgIGZwLnV0aWwuY2hlY2tBcGlLZXkoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uRXJyb3IgPSBvblN1Y2Nlc3M7XG4gICAgICAgICAgICBvblN1Y2Nlc3MgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBvblN1Y2Nlc3MgPSBvblN1Y2Nlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgb25FcnJvciA9IG9uRXJyb3IgfHwgZnAuZXJyb3JzLmhhbmRsZUVycm9yO1xuICAgICAgICB2YXIgZnBfdXJsO1xuICAgICAgICBpZiAoZnAudXRpbC5pc0ZQVXJsKGZwLnV0aWwuZ2V0RlBVcmwoZnBmaWxlKSkpIHtcbiAgICAgICAgICAgIGZwX3VybCA9IGZwZmlsZTtcbiAgICAgICAgfSBlbHNlIGlmIChmcGZpbGUudXJsKSB7XG4gICAgICAgICAgICBmcF91cmwgPSBmcGZpbGUudXJsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJJbnZhbGlkIGZpbGUgdG8gcmVtb3ZlOiBcIiArIGZwZmlsZSArIFwiLiBOb3QgYSBmaWxlcGlja2VyIHVybCBvciBGUEZpbGUgb2JqZWN0LlwiKTtcbiAgICAgICAgfVxuICAgICAgICBmcF91cmwgPSBmcC51dGlsLmdldEZQVXJsKGZwX3VybCk7XG4gICAgICAgIGZwLmZpbGVzLnJlbW92ZShmcC51dGlsLnRyaW1Db252ZXJ0KGZwX3VybCksIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvcik7XG4gICAgfTtcbiAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uKGZwZmlsZSwgY29udmVydF9vcHRpb25zLCBzdG9yZV9vcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgZnAudXRpbC5jaGVja0FwaUtleSgpO1xuICAgICAgICBpZiAoIWZwZmlsZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJObyBmcGZpbGUgZ2l2ZW4gLSBub3RoaW5nIHRvIGNvbnZlcnQhXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2Ygc3RvcmVfb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBvblByb2dyZXNzID0gb25FcnJvcjtcbiAgICAgICAgICAgIG9uRXJyb3IgPSBvblN1Y2Nlc3M7XG4gICAgICAgICAgICBvblN1Y2Nlc3MgPSBzdG9yZV9vcHRpb25zO1xuICAgICAgICAgICAgc3RvcmVfb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHZhciBvcHRpb25zID0gISFjb252ZXJ0X29wdGlvbnMgPyBmcC51dGlsLmNsb25lKGNvbnZlcnRfb3B0aW9ucykgOiB7fTtcbiAgICAgICAgc3RvcmVfb3B0aW9ucyA9IHN0b3JlX29wdGlvbnMgfHwge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIG9uUHJvZ3Jlc3MgPSBvblByb2dyZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIGlmIChzdG9yZV9vcHRpb25zLmxvY2F0aW9uKSB7XG4gICAgICAgICAgICBvcHRpb25zLnN0b3JlTG9jYXRpb24gPSBzdG9yZV9vcHRpb25zLmxvY2F0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdG9yZV9vcHRpb25zLnBhdGgpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuc3RvcmVQYXRoID0gc3RvcmVfb3B0aW9ucy5wYXRoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdG9yZV9vcHRpb25zLmNvbnRhaW5lcikge1xuICAgICAgICAgICAgb3B0aW9ucy5zdG9yZUNvbnRhaW5lciA9IHN0b3JlX29wdGlvbnMuY29udGFpbmVyO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMuc3RvcmVBY2Nlc3MgPSBzdG9yZV9vcHRpb25zLmFjY2VzcyB8fCBcInByaXZhdGVcIjtcbiAgICAgICAgdmFyIGZwX3VybDtcbiAgICAgICAgaWYgKGZwLnV0aWwuaXNGUFVybChmcC51dGlsLmdldEZQVXJsKGZwZmlsZSkpKSB7XG4gICAgICAgICAgICBmcF91cmwgPSBmcGZpbGU7XG4gICAgICAgIH0gZWxzZSBpZiAoZnBmaWxlLnVybCkge1xuICAgICAgICAgICAgZnBfdXJsID0gZnBmaWxlLnVybDtcbiAgICAgICAgICAgIGlmICghZnAubWltZXR5cGVzLm1hdGNoZXNNaW1ldHlwZShmcGZpbGUubWltZXR5cGUsIFwiaW1hZ2UvKlwiKSAmJiAhZnAubWltZXR5cGVzLm1hdGNoZXNNaW1ldHlwZShmcGZpbGUubWltZXR5cGUsIFwiYXBwbGljYXRpb24vcGRmXCIpKSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTQyKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJJbnZhbGlkIGZpbGUgdG8gY29udmVydDogXCIgKyBmcGZpbGUgKyBcIi4gTm90IGEgZmlsZXBpY2tlciB1cmwgb3IgRlBGaWxlIG9iamVjdC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgZnBfdXJsID0gZnAudXRpbC5nZXRGUFVybChmcF91cmwpO1xuICAgICAgICBpZiAoZnBfdXJsLmluZGV4T2YoXCIvY29udmVydFwiKSA+IC0xKSB7XG4gICAgICAgICAgICB2YXIgcmVzdENvbnZlcnRPcHRpb25zID0gZnAudXRpbC5wYXJzZVVybChmcF91cmwpLnBhcmFtcztcbiAgICAgICAgICAgIHJlc3RDb252ZXJ0T3B0aW9ucyA9IGZwLmNvbnZlcnNpb25zLm1hcFJlc3RQYXJhbXMocmVzdENvbnZlcnRPcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChyZXN0Q29udmVydE9wdGlvbnMuY3JvcCkge1xuICAgICAgICAgICAgICAgIGZwLnV0aWwuc2V0RGVmYXVsdChyZXN0Q29udmVydE9wdGlvbnMsIFwiY3JvcF9maXJzdFwiLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIGF0dHIgaW4gcmVzdENvbnZlcnRPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgZnAudXRpbC5zZXREZWZhdWx0KG9wdGlvbnMsIGF0dHIsIHJlc3RDb252ZXJ0T3B0aW9uc1thdHRyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZnAuY29udmVyc2lvbnMuY29udmVydChmcC51dGlsLnRyaW1Db252ZXJ0KGZwX3VybCksIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0V2lkZ2V0ID0gZnVuY3Rpb24oYmFzZSkge1xuICAgICAgICByZXR1cm4gZnAud2lkZ2V0cy5jb25zdHJ1Y3RXaWRnZXQoYmFzZSk7XG4gICAgfTtcbiAgICB2YXIgbWFrZURyb3BQYW5lID0gZnVuY3Rpb24oZGl2LCBvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBmcC5kcmFnZHJvcC5tYWtlRHJvcFBhbmUoZGl2LCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHZhciBzZXRSZXNwb25zaXZlT3B0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIGZwLnJlc3BvbnNpdmVJbWFnZXMuc2V0UmVzcG9uc2l2ZU9wdGlvbnMob3B0aW9ucyk7XG4gICAgfTtcbiAgICB2YXIgcmVzcG9uc2l2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBmcC5yZXNwb25zaXZlSW1hZ2VzLnVwZGF0ZS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2V0S2V5OiBzZXRLZXksXG4gICAgICAgIHNldFJlc3BvbnNpdmVPcHRpb25zOiBzZXRSZXNwb25zaXZlT3B0aW9ucyxcbiAgICAgICAgcGljazogcGljayxcbiAgICAgICAgcGlja0ZvbGRlcjogcGlja0ZvbGRlcixcbiAgICAgICAgcGlja011bHRpcGxlOiBwaWNrTXVsdGlwbGUsXG4gICAgICAgIHBpY2tBbmRTdG9yZTogcGlja0FuZFN0b3JlLFxuICAgICAgICByZWFkOiByZWFkLFxuICAgICAgICB3cml0ZTogd3JpdGUsXG4gICAgICAgIHdyaXRlVXJsOiB3cml0ZVVybCxcbiAgICAgICAgXCJleHBvcnRcIjogZXhwb3J0Rm4sXG4gICAgICAgIGV4cG9ydEZpbGU6IGV4cG9ydEZuLFxuICAgICAgICBwcm9jZXNzSW1hZ2U6IHByb2Nlc3NJbWFnZSxcbiAgICAgICAgc3RvcmU6IHN0b3JlLFxuICAgICAgICBzdG9yZVVybDogc3RvcmVVcmwsXG4gICAgICAgIHN0YXQ6IHN0YXQsXG4gICAgICAgIG1ldGFkYXRhOiBzdGF0LFxuICAgICAgICByZW1vdmU6IHJlbW92ZSxcbiAgICAgICAgY29udmVydDogY29udmVydCxcbiAgICAgICAgY29uc3RydWN0V2lkZ2V0OiBjb25zdHJ1Y3RXaWRnZXQsXG4gICAgICAgIG1ha2VEcm9wUGFuZTogbWFrZURyb3BQYW5lLFxuICAgICAgICBGaWxlcGlja2VyRXhjZXB0aW9uOiBGaWxlcGlja2VyRXhjZXB0aW9uLFxuICAgICAgICByZXNwb25zaXZlOiByZXNwb25zaXZlLFxuICAgICAgICB2ZXJzaW9uOiBWRVJTSU9OXG4gICAgfTtcbn0sIHRydWUpO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJtaW1ldHlwZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgbWltZXR5cGVfZXh0ZW5zaW9uX21hcCA9IHtcbiAgICAgICAgXCIuc3RsXCI6IFwiYXBwbGljYXRpb24vc2xhXCIsXG4gICAgICAgIFwiLmhic1wiOiBcInRleHQvaHRtbFwiLFxuICAgICAgICBcIi5wZGZcIjogXCJhcHBsaWNhdGlvbi9wZGZcIixcbiAgICAgICAgXCIuanBnXCI6IFwiaW1hZ2UvanBlZ1wiLFxuICAgICAgICBcIi5qcGVnXCI6IFwiaW1hZ2UvanBlZ1wiLFxuICAgICAgICBcIi5qcGVcIjogXCJpbWFnZS9qcGVnXCIsXG4gICAgICAgIFwiLmltcFwiOiBcImFwcGxpY2F0aW9uL3gtaW1wcmVzc2lvbmlzdFwiLFxuICAgICAgICBcIi52b2JcIjogXCJ2aWRlby9kdmRcIlxuICAgIH07XG4gICAgdmFyIG1pbWV0eXBlX2JhZF9hcnJheSA9IFsgXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIiwgXCJhcHBsaWNhdGlvbi9kb3dubG9hZFwiLCBcImFwcGxpY2F0aW9uL2ZvcmNlLWRvd25sb2FkXCIsIFwib2N0ZXQvc3RyZWFtXCIsIFwiYXBwbGljYXRpb24vdW5rbm93blwiLCBcImFwcGxpY2F0aW9uL3gtZG93bmxvYWRcIiwgXCJhcHBsaWNhdGlvbi94LW1zZG93bmxvYWRcIiwgXCJhcHBsaWNhdGlvbi94LXNlY3VyZS1kb3dubG9hZFwiIF07XG4gICAgdmFyIGdldE1pbWV0eXBlID0gZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICBpZiAoZmlsZS50eXBlKSB7XG4gICAgICAgICAgICB2YXIgdHlwZSA9IGZpbGUudHlwZTtcbiAgICAgICAgICAgIHR5cGUgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB2YXIgYmFkX3R5cGUgPSBmYWxzZTtcbiAgICAgICAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgbWltZXR5cGVfYmFkX2FycmF5Lmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgICAgICAgYmFkX3R5cGUgPSBiYWRfdHlwZSB8fCB0eXBlID09PSBtaW1ldHlwZV9iYWRfYXJyYXlbbl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWJhZF90eXBlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbGUudHlwZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgZmlsZW5hbWUgPSBmaWxlLm5hbWUgfHwgZmlsZS5maWxlTmFtZTtcbiAgICAgICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVuYW1lLm1hdGNoKC9cXC5cXHcqJC8pO1xuICAgICAgICBpZiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gbWltZXR5cGVfZXh0ZW5zaW9uX21hcFtleHRlbnNpb25bMF0udG9Mb3dlckNhc2UoKV0gfHwgXCJcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChmaWxlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsZS50eXBlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIG1hdGNoZXNNaW1ldHlwZSA9IGZ1bmN0aW9uKHRlc3QsIGFnYWluc3QpIHtcbiAgICAgICAgaWYgKCF0ZXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gYWdhaW5zdCA9PT0gXCIqLypcIjtcbiAgICAgICAgfVxuICAgICAgICB0ZXN0ID0gZnAudXRpbC50cmltKHRlc3QpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGFnYWluc3QgPSBmcC51dGlsLnRyaW0oYWdhaW5zdCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCBtaW1ldHlwZV9iYWRfYXJyYXkubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgIGlmICh0ZXN0ID09PSBtaW1ldHlwZV9iYWRfYXJyYXlbbl0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdGVzdF9wYXJ0cyA9IHRlc3Quc3BsaXQoXCIvXCIpLCBhZ2FpbnN0X3BhcnRzID0gYWdhaW5zdC5zcGxpdChcIi9cIik7XG4gICAgICAgIGlmIChhZ2FpbnN0X3BhcnRzWzBdID09PSBcIipcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFnYWluc3RfcGFydHNbMF0gIT09IHRlc3RfcGFydHNbMF0pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWdhaW5zdF9wYXJ0c1sxXSA9PT0gXCIqXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhZ2FpbnN0X3BhcnRzWzFdID09PSB0ZXN0X3BhcnRzWzFdO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0TWltZXR5cGU6IGdldE1pbWV0eXBlLFxuICAgICAgICBtYXRjaGVzTWltZXR5cGU6IG1hdGNoZXNNaW1ldHlwZVxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwic2VydmljZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgQ09NUFVURVI6IDEsXG4gICAgICAgIERST1BCT1g6IDIsXG4gICAgICAgIEZBQ0VCT09LOiAzLFxuICAgICAgICBHSVRIVUI6IDQsXG4gICAgICAgIEdNQUlMOiA1LFxuICAgICAgICBJTUFHRV9TRUFSQ0g6IDYsXG4gICAgICAgIFVSTDogNyxcbiAgICAgICAgV0VCQ0FNOiA4LFxuICAgICAgICBHT09HTEVfRFJJVkU6IDksXG4gICAgICAgIFNFTkRfRU1BSUw6IDEwLFxuICAgICAgICBJTlNUQUdSQU06IDExLFxuICAgICAgICBGTElDS1I6IDEyLFxuICAgICAgICBWSURFTzogMTMsXG4gICAgICAgIEVWRVJOT1RFOiAxNCxcbiAgICAgICAgUElDQVNBOiAxNSxcbiAgICAgICAgV0VCREFWOiAxNixcbiAgICAgICAgRlRQOiAxNyxcbiAgICAgICAgQUxGUkVTQ086IDE4LFxuICAgICAgICBCT1g6IDE5LFxuICAgICAgICBTS1lEUklWRTogMjAsXG4gICAgICAgIEdEUklWRTogMjEsXG4gICAgICAgIENVU1RPTVNPVVJDRTogMjIsXG4gICAgICAgIENMT1VERFJJVkU6IDIzLFxuICAgICAgICBHRU5FUklDOiAyNCxcbiAgICAgICAgQ09OVkVSVDogMjUsXG4gICAgICAgIEFVRElPOiAyNlxuICAgIH07XG59LCB0cnVlKTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwidXJsc1wiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBiYXNlID0gXCJodHRwczovL3d3dy5maWxlcGlja2VyLmlvXCI7XG4gICAgaWYgKHdpbmRvdy5maWxlcGlja2VyLmhvc3RuYW1lKSB7XG4gICAgICAgIGJhc2UgPSB3aW5kb3cuZmlsZXBpY2tlci5ob3N0bmFtZTtcbiAgICB9XG4gICAgdmFyIGRpYWxvZ19iYXNlID0gYmFzZS5yZXBsYWNlKFwid3d3XCIsIFwiZGlhbG9nXCIpLCBwaWNrX3VybCA9IGRpYWxvZ19iYXNlICsgXCIvZGlhbG9nL29wZW4vXCIsIGV4cG9ydF91cmwgPSBkaWFsb2dfYmFzZSArIFwiL2RpYWxvZy9zYXZlL1wiLCBjb252ZXJ0X3VybCA9IGRpYWxvZ19iYXNlICsgXCIvZGlhbG9nL3Byb2Nlc3MvXCIsIHBpY2tfZm9sZGVyX3VybCA9IGRpYWxvZ19iYXNlICsgXCIvZGlhbG9nL2ZvbGRlci9cIiwgc3RvcmVfdXJsID0gYmFzZSArIFwiL2FwaS9zdG9yZS9cIjtcbiAgICB2YXIgYWxsb3dlZENvbnZlcnNpb25zID0gWyBcImNyb3BcIiwgXCJyb3RhdGVcIiwgXCJmaWx0ZXJcIiBdO1xuICAgIHZhciBjb25zdHJ1Y3RQaWNrVXJsID0gZnVuY3Rpb24ob3B0aW9ucywgaWQsIG11bHRpcGxlKSB7XG4gICAgICAgIHJldHVybiBwaWNrX3VybCArIGNvbnN0cnVjdE1vZGFsUXVlcnkob3B0aW9ucywgaWQpICsgKG11bHRpcGxlID8gXCImbXVsdGk9XCIgKyAhIW11bHRpcGxlIDogXCJcIikgKyAob3B0aW9ucy5taW1ldHlwZXMgIT09IHVuZGVmaW5lZCA/IFwiJm09XCIgKyBvcHRpb25zLm1pbWV0eXBlcy5qb2luKFwiLFwiKSA6IFwiXCIpICsgKG9wdGlvbnMuZXh0ZW5zaW9ucyAhPT0gdW5kZWZpbmVkID8gXCImZXh0PVwiICsgb3B0aW9ucy5leHRlbnNpb25zLmpvaW4oXCIsXCIpIDogXCJcIikgKyAob3B0aW9ucy5tYXhTaXplID8gXCImbWF4U2l6ZT1cIiArIG9wdGlvbnMubWF4U2l6ZSA6IFwiXCIpICsgKG9wdGlvbnMuY3VzdG9tU291cmNlQ29udGFpbmVyID8gXCImY3VzdG9tU291cmNlQ29udGFpbmVyPVwiICsgb3B0aW9ucy5jdXN0b21Tb3VyY2VDb250YWluZXIgOiBcIlwiKSArIChvcHRpb25zLmN1c3RvbVNvdXJjZVBhdGggPyBcIiZjdXN0b21Tb3VyY2VQYXRoPVwiICsgb3B0aW9ucy5jdXN0b21Tb3VyY2VQYXRoIDogXCJcIikgKyAob3B0aW9ucy5tYXhGaWxlcyA/IFwiJm1heEZpbGVzPVwiICsgb3B0aW9ucy5tYXhGaWxlcyA6IFwiXCIpICsgKG9wdGlvbnMuZm9sZGVycyAhPT0gdW5kZWZpbmVkID8gXCImZm9sZGVycz1cIiArIG9wdGlvbnMuZm9sZGVycyA6IFwiXCIpICsgKG9wdGlvbnMuc3RvcmVMb2NhdGlvbiA/IFwiJnN0b3JlTG9jYXRpb249XCIgKyBvcHRpb25zLnN0b3JlTG9jYXRpb24gOiBcIlwiKSArIChvcHRpb25zLnN0b3JlUGF0aCA/IFwiJnN0b3JlUGF0aD1cIiArIG9wdGlvbnMuc3RvcmVQYXRoIDogXCJcIikgKyAob3B0aW9ucy5zdG9yZUNvbnRhaW5lciA/IFwiJnN0b3JlQ29udGFpbmVyPVwiICsgb3B0aW9ucy5zdG9yZUNvbnRhaW5lciA6IFwiXCIpICsgKG9wdGlvbnMuc3RvcmVSZWdpb24gPyBcIiZzdG9yZVJlZ2lvbj1cIiArIG9wdGlvbnMuc3RvcmVSZWdpb24gOiBcIlwiKSArIChvcHRpb25zLnN0b3JlQWNjZXNzID8gXCImc3RvcmVBY2Nlc3M9XCIgKyBvcHRpb25zLnN0b3JlQWNjZXNzIDogXCJcIikgKyAob3B0aW9ucy53ZWJjYW0gJiYgb3B0aW9ucy53ZWJjYW0ud2ViY2FtRGltID8gXCImd2RpbT1cIiArIG9wdGlvbnMud2ViY2FtLndlYmNhbURpbS5qb2luKFwiLFwiKSA6IFwiXCIpICsgKG9wdGlvbnMud2ViY2FtRGltID8gXCImd2RpbT1cIiArIG9wdGlvbnMud2ViY2FtRGltLmpvaW4oXCIsXCIpIDogXCJcIikgKyAob3B0aW9ucy53ZWJjYW0gJiYgb3B0aW9ucy53ZWJjYW0udmlkZW9SZXMgPyBcIiZ2aWRlb1Jlcz1cIiArIG9wdGlvbnMud2ViY2FtLnZpZGVvUmVzIDogXCJcIikgKyAob3B0aW9ucy53ZWJjYW0gJiYgb3B0aW9ucy53ZWJjYW0udmlkZW9MZW4gPyBcIiZ2aWRlb0xlbj1cIiArIG9wdGlvbnMud2ViY2FtLnZpZGVvTGVuIDogXCJcIikgKyAob3B0aW9ucy53ZWJjYW0gJiYgb3B0aW9ucy53ZWJjYW0uYXVkaW9MZW4gPyBcIiZhdWRpb0xlbj1cIiArIG9wdGlvbnMud2ViY2FtLmF1ZGlvTGVuIDogXCJcIikgKyBjb25zdHJ1Y3RDb252ZXJzaW9uc1F1ZXJ5KG9wdGlvbnMuY29udmVyc2lvbnMpO1xuICAgIH07XG4gICAgdmFyIGNvbnN0cnVjdENvbnZlcnRVcmwgPSBmdW5jdGlvbihvcHRpb25zLCBpZCkge1xuICAgICAgICB2YXIgdXJsID0gb3B0aW9ucy5jb252ZXJ0VXJsO1xuICAgICAgICBpZiAodXJsLmluZGV4T2YoXCImXCIpID49IDAgfHwgdXJsLmluZGV4T2YoXCI/XCIpID49IDApIHtcbiAgICAgICAgICAgIHVybCA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb252ZXJ0X3VybCArIGNvbnN0cnVjdE1vZGFsUXVlcnkob3B0aW9ucywgaWQpICsgXCImY3VybD1cIiArIHVybCArIGNvbnN0cnVjdENvbnZlcnNpb25zUXVlcnkob3B0aW9ucy5jb252ZXJzaW9ucyk7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0UGlja0ZvbGRlclVybCA9IGZ1bmN0aW9uKG9wdGlvbnMsIGlkKSB7XG4gICAgICAgIHJldHVybiBwaWNrX2ZvbGRlcl91cmwgKyBjb25zdHJ1Y3RNb2RhbFF1ZXJ5KG9wdGlvbnMsIGlkKTtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3RFeHBvcnRVcmwgPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMsIGlkKSB7XG4gICAgICAgIGlmICh1cmwuaW5kZXhPZihcIiZcIikgPj0gMCB8fCB1cmwuaW5kZXhPZihcIj9cIikgPj0gMCkge1xuICAgICAgICAgICAgdXJsID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGV4cG9ydF91cmwgKyBjb25zdHJ1Y3RNb2RhbFF1ZXJ5KG9wdGlvbnMsIGlkKSArIFwiJnVybD1cIiArIHVybCArIChvcHRpb25zLm1pbWV0eXBlICE9PSB1bmRlZmluZWQgPyBcIiZtPVwiICsgb3B0aW9ucy5taW1ldHlwZSA6IFwiXCIpICsgKG9wdGlvbnMuZXh0ZW5zaW9uICE9PSB1bmRlZmluZWQgPyBcIiZleHQ9XCIgKyBvcHRpb25zLmV4dGVuc2lvbiA6IFwiXCIpICsgKG9wdGlvbnMuc3VnZ2VzdGVkRmlsZW5hbWUgPyBcIiZkZWZhdWx0U2F2ZWFzTmFtZT1cIiArIG9wdGlvbnMuc3VnZ2VzdGVkRmlsZW5hbWUgOiBcIlwiKTtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3RTdG9yZVVybCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIHN0b3JlX3VybCArIG9wdGlvbnMubG9jYXRpb24gKyBcIj9rZXk9XCIgKyBmcC5hcGlrZXkgKyAob3B0aW9ucy5iYXNlNjRkZWNvZGUgPyBcIiZiYXNlNjRkZWNvZGU9dHJ1ZVwiIDogXCJcIikgKyAob3B0aW9ucy5taW1ldHlwZSA/IFwiJm1pbWV0eXBlPVwiICsgb3B0aW9ucy5taW1ldHlwZSA6IFwiXCIpICsgKG9wdGlvbnMuZmlsZW5hbWUgPyBcIiZmaWxlbmFtZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChvcHRpb25zLmZpbGVuYW1lKSA6IFwiXCIpICsgKG9wdGlvbnMucGF0aCA/IFwiJnBhdGg9XCIgKyBvcHRpb25zLnBhdGggOiBcIlwiKSArIChvcHRpb25zLmNvbnRhaW5lciA/IFwiJmNvbnRhaW5lcj1cIiArIG9wdGlvbnMuY29udGFpbmVyIDogXCJcIikgKyAob3B0aW9ucy5hY2Nlc3MgPyBcIiZhY2Nlc3M9XCIgKyBvcHRpb25zLmFjY2VzcyA6IFwiXCIpICsgY29uc3RydWN0U2VjdXJpdHlRdWVyeShvcHRpb25zKSArIFwiJnBsdWdpbj1cIiArIGdldFBsdWdpbigpO1xuICAgIH07XG4gICAgdmFyIGNvbnN0cnVjdFdyaXRlVXJsID0gZnVuY3Rpb24oZnBfdXJsLCBvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBmcF91cmwgKyBcIj9ub25jZT1mcFwiICsgKCEhb3B0aW9ucy5iYXNlNjRkZWNvZGUgPyBcIiZiYXNlNjRkZWNvZGU9dHJ1ZVwiIDogXCJcIikgKyAob3B0aW9ucy5taW1ldHlwZSA/IFwiJm1pbWV0eXBlPVwiICsgb3B0aW9ucy5taW1ldHlwZSA6IFwiXCIpICsgY29uc3RydWN0U2VjdXJpdHlRdWVyeShvcHRpb25zKSArIFwiJnBsdWdpbj1cIiArIGdldFBsdWdpbigpO1xuICAgIH07XG4gICAgdmFyIGNvbnN0cnVjdEhvc3RDb21tRmFsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHBhcnRzID0gZnAudXRpbC5wYXJzZVVybCh3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgICAgIHJldHVybiBwYXJ0cy5vcmlnaW4gKyBcIi80MDRcIjtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIGNvbnN0cnVjdE1vZGFsUXVlcnkob3B0aW9ucywgaWQpIHtcbiAgICAgICAgcmV0dXJuIFwiP2tleT1cIiArIGZwLmFwaWtleSArIFwiJmlkPVwiICsgaWQgKyBcIiZyZWZlcnJlcj1cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSArIFwiJmlmcmFtZT1cIiArIChvcHRpb25zLmNvbnRhaW5lciAhPT0gXCJ3aW5kb3dcIikgKyBcIiZ2ZXJzaW9uPVwiICsgZnAuQVBJX1ZFUlNJT04gKyAob3B0aW9ucy5zZXJ2aWNlcyA/IFwiJnM9XCIgKyBvcHRpb25zLnNlcnZpY2VzLmpvaW4oXCIsXCIpIDogXCJcIikgKyAob3B0aW9ucy5jb250YWluZXIgIT09IHVuZGVmaW5lZCA/IFwiJmNvbnRhaW5lcj1cIiArIG9wdGlvbnMuY29udGFpbmVyIDogXCJtb2RhbFwiKSArIChvcHRpb25zLm9wZW5UbyA/IFwiJmxvYz1cIiArIG9wdGlvbnMub3BlblRvIDogXCJcIikgKyBcIiZsYW5ndWFnZT1cIiArIChvcHRpb25zLmxhbmd1YWdlIHx8IGZwLmJyb3dzZXIuZ2V0TGFuZ3VhZ2UoKSkgKyAob3B0aW9ucy5tb2JpbGUgIT09IHVuZGVmaW5lZCA/IFwiJm1vYmlsZT1cIiArIG9wdGlvbnMubW9iaWxlIDogXCJcIikgKyAob3B0aW9ucy5iYWNrZ3JvdW5kVXBsb2FkICE9PSB1bmRlZmluZWQgPyBcIiZidT1cIiArIG9wdGlvbnMuYmFja2dyb3VuZFVwbG9hZCA6IFwiXCIpICsgKG9wdGlvbnMuY3JvcFJhdGlvID8gXCImY3JhdGlvPVwiICsgb3B0aW9ucy5jcm9wUmF0aW8gOiBcIlwiKSArIChvcHRpb25zLmNyb3BEaW0gPyBcIiZjZGltPVwiICsgb3B0aW9ucy5jcm9wRGltLmpvaW4oXCIsXCIpIDogXCJcIikgKyAob3B0aW9ucy5jcm9wTWF4ID8gXCImY21heD1cIiArIG9wdGlvbnMuY3JvcE1heC5qb2luKFwiLFwiKSA6IFwiXCIpICsgKG9wdGlvbnMuY3JvcE1pbiA/IFwiJmNtaW49XCIgKyBvcHRpb25zLmNyb3BNaW4uam9pbihcIixcIikgOiBcIlwiKSArIChvcHRpb25zLmNyb3BGb3JjZSAhPT0gdW5kZWZpbmVkID8gXCImY2ZvcmNlPVwiICsgb3B0aW9ucy5jcm9wRm9yY2UgOiBcIlwiKSArIChvcHRpb25zLmhpZGUgIT09IHVuZGVmaW5lZCA/IFwiJmhpZGU9XCIgKyBvcHRpb25zLmhpZGUgOiBcIlwiKSArIChvcHRpb25zLmN1c3RvbUNzcyA/IFwiJmNzcz1cIiArIGVuY29kZVVSSUNvbXBvbmVudChvcHRpb25zLmN1c3RvbUNzcykgOiBcIlwiKSArIChvcHRpb25zLmN1c3RvbVRleHQgPyBcIiZ0ZXh0PVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG9wdGlvbnMuY3VzdG9tVGV4dCkgOiBcIlwiKSArIChvcHRpb25zLmltYWdlTWluID8gXCImaW1pbj1cIiArIG9wdGlvbnMuaW1hZ2VNaW4uam9pbihcIixcIikgOiBcIlwiKSArIChvcHRpb25zLmltYWdlTWF4ID8gXCImaW1heD1cIiArIG9wdGlvbnMuaW1hZ2VNYXguam9pbihcIixcIikgOiBcIlwiKSArIChvcHRpb25zLmltYWdlRGltID8gXCImaWRpbT1cIiArIG9wdGlvbnMuaW1hZ2VEaW0uam9pbihcIixcIikgOiBcIlwiKSArIChvcHRpb25zLmltYWdlUXVhbGl0eSA/IFwiJmlxPVwiICsgb3B0aW9ucy5pbWFnZVF1YWxpdHkgOiBcIlwiKSArIChvcHRpb25zLm5vRmlsZVJlYWRlciA/IFwiJm5mbD1cIiArIG9wdGlvbnMubm9GaWxlUmVhZGVyIDogXCJcIikgKyAoZnAudXRpbC5pc0NhbnZhc1N1cHBvcnRlZCgpID8gXCJcIiA6IFwiJmNhbnZhcz1mYWxzZVwiKSArIChvcHRpb25zLnJlZGlyZWN0VXJsID8gXCImcmVkaXJlY3RfdXJsPVwiICsgb3B0aW9ucy5yZWRpcmVjdFVybCA6IFwiXCIpICsgKG9wdGlvbnMuc2hvd0Nsb3NlICYmIG9wdGlvbnMuY29udGFpbmVyICE9PSBcIm1vZGFsXCIgPyBcIiZzaG93Q2xvc2U9XCIgKyBvcHRpb25zLnNob3dDbG9zZSA6IFwiXCIpICsgY29uc3RydWN0U2VjdXJpdHlRdWVyeShvcHRpb25zKSArIFwiJnBsdWdpbj1cIiArIGdldFBsdWdpbigpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjb25zdHJ1Y3RTZWN1cml0eVF1ZXJ5KG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIChvcHRpb25zLnNpZ25hdHVyZSA/IFwiJnNpZ25hdHVyZT1cIiArIG9wdGlvbnMuc2lnbmF0dXJlIDogXCJcIikgKyAob3B0aW9ucy5wb2xpY3kgPyBcIiZwb2xpY3k9XCIgKyBvcHRpb25zLnBvbGljeSA6IFwiXCIpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRQbHVnaW4oKSB7XG4gICAgICAgIHJldHVybiBmaWxlcGlja2VyLnBsdWdpbiB8fCBcImpzX2xpYlwiO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjb25zdHJ1Y3RDb252ZXJzaW9uc1F1ZXJ5KGNvbnZlcnNpb25zKSB7XG4gICAgICAgIGNvbnZlcnNpb25zID0gY29udmVyc2lvbnMgfHwgW107XG4gICAgICAgIHZhciBhbGxvd2VkID0gW10sIGksIGo7XG4gICAgICAgIGZvciAoaSBpbiBjb252ZXJzaW9ucykge1xuICAgICAgICAgICAgZm9yIChqIGluIGFsbG93ZWRDb252ZXJzaW9ucykge1xuICAgICAgICAgICAgICAgIGlmIChjb252ZXJzaW9uc1tpXSA9PT0gYWxsb3dlZENvbnZlcnNpb25zW2pdICYmIGNvbnZlcnNpb25zLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWQucHVzaChjb252ZXJzaW9uc1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghYWxsb3dlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFsbG93ZWQucHVzaChcImNyb3BcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwiJmNvPVwiICsgYWxsb3dlZC5qb2luKFwiLFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgQkFTRTogYmFzZSxcbiAgICAgICAgRElBTE9HX0JBU0U6IGRpYWxvZ19iYXNlLFxuICAgICAgICBBUElfQ09NTTogYmFzZSArIFwiL2RpYWxvZy9jb21tX2lmcmFtZS9cIixcbiAgICAgICAgQ09NTTogZGlhbG9nX2Jhc2UgKyBcIi9kaWFsb2cvY29tbV9pZnJhbWUvXCIsXG4gICAgICAgIEZQX0NPTU1fRkFMTEJBQ0s6IGRpYWxvZ19iYXNlICsgXCIvZGlhbG9nL2NvbW1faGFzaF9pZnJhbWUvXCIsXG4gICAgICAgIFNUT1JFOiBzdG9yZV91cmwsXG4gICAgICAgIFBJQ0s6IHBpY2tfdXJsLFxuICAgICAgICBFWFBPUlQ6IGV4cG9ydF91cmwsXG4gICAgICAgIGNvbnN0cnVjdFBpY2tVcmw6IGNvbnN0cnVjdFBpY2tVcmwsXG4gICAgICAgIGNvbnN0cnVjdENvbnZlcnRVcmw6IGNvbnN0cnVjdENvbnZlcnRVcmwsXG4gICAgICAgIGNvbnN0cnVjdFBpY2tGb2xkZXJVcmw6IGNvbnN0cnVjdFBpY2tGb2xkZXJVcmwsXG4gICAgICAgIGNvbnN0cnVjdEV4cG9ydFVybDogY29uc3RydWN0RXhwb3J0VXJsLFxuICAgICAgICBjb25zdHJ1Y3RXcml0ZVVybDogY29uc3RydWN0V3JpdGVVcmwsXG4gICAgICAgIGNvbnN0cnVjdFN0b3JlVXJsOiBjb25zdHJ1Y3RTdG9yZVVybCxcbiAgICAgICAgY29uc3RydWN0SG9zdENvbW1GYWxsYmFjazogY29uc3RydWN0SG9zdENvbW1GYWxsYmFjayxcbiAgICAgICAgZ2V0UGx1Z2luOiBnZXRQbHVnaW5cbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImFqYXhcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgZ2V0X3JlcXVlc3QgPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucy5tZXRob2QgPSBcIkdFVFwiO1xuICAgICAgICBtYWtlX3JlcXVlc3QodXJsLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHZhciBwb3N0X3JlcXVlc3QgPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucy5tZXRob2QgPSBcIlBPU1RcIjtcbiAgICAgICAgdXJsICs9ICh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCA/IFwiJlwiIDogXCI/XCIpICsgXCJfY2FjaGVCdXN0PVwiICsgZnAudXRpbC5nZXRJZCgpO1xuICAgICAgICBtYWtlX3JlcXVlc3QodXJsLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHZhciB0b1F1ZXJ5U3RyaW5nID0gZnVuY3Rpb24ob2JqZWN0LCBiYXNlKSB7XG4gICAgICAgIHZhciBxdWVyeVN0cmluZyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICAgIGlmIChiYXNlKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gYmFzZSArIFwiLiArIGtleSArIFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICAgIHN3aXRjaCAoZnAudXRpbC50eXBlT2YodmFsdWUpKSB7XG4gICAgICAgICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB0b1F1ZXJ5U3RyaW5nKHZhbHVlLCBrZXkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIGNhc2UgXCJhcnJheVwiOlxuICAgICAgICAgICAgICAgIHZhciBxcyA9IHt9O1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcXNbaV0gPSB2YWx1ZVtpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdG9RdWVyeVN0cmluZyhxcywga2V5KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGtleSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcXVlcnlTdHJpbmcuam9pbihcIiZcIik7XG4gICAgfTtcbiAgICB2YXIgZ2V0WGhyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgd2luZG93LkFjdGl2ZVhPYmplY3QoXCJNc3htbDIuWE1MSFRUUFwiKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHdpbmRvdy5BY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTEhUVFBcIik7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBtYWtlX3JlcXVlc3QgPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgdXJsID0gdXJsIHx8IFwiXCI7XG4gICAgICAgIHZhciBtZXRob2QgPSBvcHRpb25zLm1ldGhvZCA/IG9wdGlvbnMubWV0aG9kLnRvVXBwZXJDYXNlKCkgOiBcIlBPU1RcIjtcbiAgICAgICAgdmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgdmFyIGVycm9yID0gb3B0aW9ucy5lcnJvciB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgYXN5bmMgPSBvcHRpb25zLmFzeW5jID09PSB1bmRlZmluZWQgPyB0cnVlIDogb3B0aW9ucy5hc3luYztcbiAgICAgICAgdmFyIGRhdGEgPSBvcHRpb25zLmRhdGEgfHwgbnVsbDtcbiAgICAgICAgdmFyIHByb2Nlc3NEYXRhID0gb3B0aW9ucy5wcm9jZXNzRGF0YSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IG9wdGlvbnMucHJvY2Vzc0RhdGE7XG4gICAgICAgIHZhciBoZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzIHx8IHt9O1xuICAgICAgICB2YXIgdXJsUGFydHMgPSBmcC51dGlsLnBhcnNlVXJsKHVybCk7XG4gICAgICAgIHZhciBvcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdDtcbiAgICAgICAgdmFyIGNyb3NzZG9tYWluID0gb3JpZ2luICE9PSB1cmxQYXJ0cy5vcmlnaW47XG4gICAgICAgIHZhciBmaW5pc2hlZCA9IGZhbHNlO1xuICAgICAgICB1cmwgKz0gKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwID8gXCImXCIgOiBcIj9cIikgKyBcInBsdWdpbj1cIiArIGZwLnVybHMuZ2V0UGx1Z2luKCk7XG4gICAgICAgIGlmIChkYXRhICYmIHByb2Nlc3NEYXRhKSB7XG4gICAgICAgICAgICBkYXRhID0gdG9RdWVyeVN0cmluZyhvcHRpb25zLmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB4aHI7XG4gICAgICAgIGlmIChvcHRpb25zLnhocikge1xuICAgICAgICAgICAgeGhyID0gb3B0aW9ucy54aHI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4aHIgPSBnZXRYaHIoKTtcbiAgICAgICAgICAgIGlmICgheGhyKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5lcnJvcihcIkFqYXggbm90IGFsbG93ZWRcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3Jvc3Nkb21haW4gJiYgd2luZG93LlhEb21haW5SZXF1ZXN0ICYmICEoXCJ3aXRoQ3JlZGVudGlhbHNcIiBpbiB4aHIpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFhEb21haW5BamF4KHVybCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMucHJvZ3Jlc3MgJiYgeGhyLnVwbG9hZCkge1xuICAgICAgICAgICAgeGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKFwicHJvZ3Jlc3NcIiwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLmxlbmd0aENvbXB1dGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5wcm9ncmVzcyhNYXRoLnJvdW5kKGUubG9hZGVkICogOTUgLyBlLnRvdGFsKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBvblN0YXRlQ2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT0gNCAmJiAhZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5wcm9ncmVzcykge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnByb2dyZXNzKDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXNwID0geGhyLnJlc3BvbnNlVGV4dDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuanNvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNwID0gZnAuanNvbi5kZWNvZGUocmVzcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25lcnJvci5jYWxsKHhociwgXCJJbnZhbGlkIGpzb246IFwiICsgcmVzcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MocmVzcCwgeGhyLnN0YXR1cywgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgZmluaXNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uZXJyb3IuY2FsbCh4aHIsIHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gb25TdGF0ZUNoYW5nZTtcbiAgICAgICAgdmFyIG9uZXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIGlmIChmaW5pc2hlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLnByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5wcm9ncmVzcygxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmluaXNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09IDQwMCkge1xuICAgICAgICAgICAgICAgIGVycm9yKFwiYmFkX3BhcmFtc1wiLCB0aGlzLnN0YXR1cywgdGhpcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXR1cyA9PSA0MDMpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIm5vdF9hdXRob3JpemVkXCIsIHRoaXMuc3RhdHVzLCB0aGlzKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdHVzID09IDQwNCkge1xuICAgICAgICAgICAgICAgIGVycm9yKFwibm90X2ZvdW5kXCIsIHRoaXMuc3RhdHVzLCB0aGlzKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY3Jvc3Nkb21haW4pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDQgJiYgdGhpcy5zdGF0dXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJDT1JTX25vdF9hbGxvd2VkXCIsIHRoaXMuc3RhdHVzLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQ09SU19lcnJvclwiLCB0aGlzLnN0YXR1cywgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlcnJvcihlcnIsIHRoaXMuc3RhdHVzLCB0aGlzKTtcbiAgICAgICAgfTtcbiAgICAgICAgeGhyLm9uZXJyb3IgPSBvbmVycm9yO1xuICAgICAgICBpZiAoZGF0YSAmJiBtZXRob2QgPT0gXCJHRVRcIikge1xuICAgICAgICAgICAgdXJsICs9ICh1cmwuaW5kZXhPZihcIj9cIikgIT09IC0xID8gXCImXCIgOiBcIj9cIikgKyBkYXRhO1xuICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgeGhyLm9wZW4obWV0aG9kLCB1cmwsIGFzeW5jKTtcbiAgICAgICAgaWYgKG9wdGlvbnMuanNvbikge1xuICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoXCJBY2NlcHRcIiwgXCJhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L2phdmFzY3JpcHRcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIkFjY2VwdFwiLCBcInRleHQvamF2YXNjcmlwdCwgdGV4dC9odG1sLCBhcHBsaWNhdGlvbi94bWwsIHRleHQveG1sLCAqLypcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbnRlbnRUeXBlID0gaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXSB8fCBoZWFkZXJzW1wiY29udGVudC10eXBlXCJdO1xuICAgICAgICBpZiAoZGF0YSAmJiBwcm9jZXNzRGF0YSAmJiAobWV0aG9kID09IFwiUE9TVFwiIHx8IG1ldGhvZCA9PSBcIlBVVFwiKSAmJiBjb250ZW50VHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD11dGYtOFwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhZGVycykge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIGhlYWRlcnNba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgeGhyLnNlbmQoZGF0YSk7XG4gICAgICAgIHJldHVybiB4aHI7XG4gICAgfTtcbiAgICB2YXIgWERvbWFpbkFqYXggPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuWERvbWFpblJlcXVlc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtZXRob2QgPSBvcHRpb25zLm1ldGhvZCA/IG9wdGlvbnMubWV0aG9kLnRvVXBwZXJDYXNlKCkgOiBcIlBPU1RcIjtcbiAgICAgICAgdmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgdmFyIGVycm9yID0gb3B0aW9ucy5lcnJvciB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgZGF0YSA9IG9wdGlvbnMuZGF0YSB8fCB7fTtcbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PSBcImh0dHA6XCIpIHtcbiAgICAgICAgICAgIHVybCA9IHVybC5yZXBsYWNlKFwiaHR0cHM6XCIsIFwiaHR0cDpcIik7XG4gICAgICAgIH0gZWxzZSBpZiAod2luZG93LmxvY2F0aW9uLnByb3RvY29sID09IFwiaHR0cHM6XCIpIHtcbiAgICAgICAgICAgIHVybCA9IHVybC5yZXBsYWNlKFwiaHR0cDpcIiwgXCJodHRwczpcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuYXN5bmMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiQXN5bmNyb25vdXMgQ3Jvc3MtZG9tYWluIHJlcXVlc3RzIGFyZSBub3Qgc3VwcG9ydGVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtZXRob2QgIT09IFwiR0VUXCIgJiYgbWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgICAgICAgICAgZGF0YS5fbWV0aG9kID0gbWV0aG9kO1xuICAgICAgICAgICAgbWV0aG9kID0gXCJQT1NUXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMucHJvY2Vzc0RhdGEgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YSA/IHRvUXVlcnlTdHJpbmcoZGF0YSkgOiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhICYmIG1ldGhvZCA9PSBcIkdFVFwiKSB7XG4gICAgICAgICAgICB1cmwgKz0gKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwID8gXCImXCIgOiBcIj9cIikgKyBkYXRhO1xuICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdXJsICs9ICh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCA/IFwiJlwiIDogXCI/XCIpICsgXCJfeGRyPXRydWUmX2NhY2hlQnVzdD1cIiArIGZwLnV0aWwuZ2V0SWQoKTtcbiAgICAgICAgdmFyIHhkciA9IG5ldyB3aW5kb3cuWERvbWFpblJlcXVlc3QoKTtcbiAgICAgICAgeGRyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHJlc3AgPSB4ZHIucmVzcG9uc2VUZXh0O1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMucHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnByb2dyZXNzKDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5qc29uKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcCA9IGZwLmpzb24uZGVjb2RlKHJlc3ApO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJJbnZhbGlkIGpzb246IFwiICsgcmVzcCwgMjAwLCB4ZHIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3VjY2VzcyhyZXNwLCAyMDAsIHhkcik7XG4gICAgICAgIH07XG4gICAgICAgIHhkci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5wcm9ncmVzcykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMucHJvZ3Jlc3MoMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVycm9yKHhkci5yZXNwb25zZVRleHQgfHwgXCJDT1JTX2Vycm9yXCIsIHRoaXMuc3RhdHVzIHx8IDUwMCwgdGhpcyk7XG4gICAgICAgIH07XG4gICAgICAgIHhkci5vbnByb2dyZXNzID0gZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgeGRyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHhkci50aW1lb3V0ID0gM2U0O1xuICAgICAgICB4ZHIub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHhkci5zZW5kKGRhdGEpO1xuICAgICAgICByZXR1cm4geGRyO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0OiBnZXRfcmVxdWVzdCxcbiAgICAgICAgcG9zdDogcG9zdF9yZXF1ZXN0LFxuICAgICAgICByZXF1ZXN0OiBtYWtlX3JlcXVlc3RcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImZpbGVzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIHJlYWRGcm9tRlBVcmwgPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICB2YXIgdGVtcDY0ID0gb3B0aW9ucy5iYXNlNjRlbmNvZGUgPT09IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHRlbXA2NCkge1xuICAgICAgICAgICAgb3B0aW9ucy5iYXNlNjRlbmNvZGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMuYmFzZTY0ZW5jb2RlID0gb3B0aW9ucy5iYXNlNjRlbmNvZGUgIT09IGZhbHNlO1xuICAgICAgICB2YXIgc3VjY2VzcyA9IGZ1bmN0aW9uKHJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgaWYgKHRlbXA2NCkge1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlVGV4dCA9IGZwLmJhc2U2NC5kZWNvZGUocmVzcG9uc2VUZXh0LCAhIW9wdGlvbnMuYXNUZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZVRleHQpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkRnJvbVVybC5jYWxsKHRoaXMsIHVybCwgb3B0aW9ucywgc3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgfTtcbiAgICB2YXIgcmVhZEZyb21VcmwgPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBpZiAob3B0aW9ucy5jYWNoZSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5fY2FjaGVCdXN0ID0gZnAudXRpbC5nZXRJZCgpO1xuICAgICAgICB9XG4gICAgICAgIGZwLmFqYXguZ2V0KHVybCwge1xuICAgICAgICAgICAgZGF0YTogb3B0aW9ucyxcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICBcIlgtTk8tU1RSRUFNXCI6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzOiBvblN1Y2Nlc3MsXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24obXNnLCBzdGF0dXMsIHhocikge1xuICAgICAgICAgICAgICAgIGlmIChtc2cgPT09IFwiQ09SU19ub3RfYWxsb3dlZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDExMykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIkNPUlNfZXJyb3JcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMTQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfZm91bmRcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMTUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJiYWRfcGFyYW1zXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoNDAwKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwibm90X2F1dGhvcml6ZWRcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcig0MDMpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMTgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJvZ3Jlc3M6IG9uUHJvZ3Jlc3NcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICB2YXIgcmVhZEZyb21GaWxlID0gZnVuY3Rpb24oZmlsZSwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGlmICghKHdpbmRvdy5GaWxlICYmIHdpbmRvdy5GaWxlUmVhZGVyICYmIHdpbmRvdy5GaWxlTGlzdCAmJiB3aW5kb3cuQmxvYikpIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MoMTApO1xuICAgICAgICAgICAgZnAuZmlsZXMuc3RvcmVGaWxlKGZpbGUsIHt9LCBmdW5jdGlvbihmcGZpbGUpIHtcbiAgICAgICAgICAgICAgICBvblByb2dyZXNzKDUwKTtcbiAgICAgICAgICAgICAgICBmcC5maWxlcy5yZWFkRnJvbUZQVXJsKGZwZmlsZS51cmwsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgZnVuY3Rpb24ocHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgb25Qcm9ncmVzcyg1MCArIHByb2dyZXNzIC8gMik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBvbkVycm9yLCBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MocHJvZ3Jlc3MgLyAyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBiYXNlNjRlbmNvZGUgPSAhIW9wdGlvbnMuYmFzZTY0ZW5jb2RlO1xuICAgICAgICB2YXIgYXNUZXh0ID0gISFvcHRpb25zLmFzVGV4dDtcbiAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgIHJlYWRlci5vbnByb2dyZXNzID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBpZiAoZXZ0Lmxlbmd0aENvbXB1dGFibGUpIHtcbiAgICAgICAgICAgICAgICBvblByb2dyZXNzKE1hdGgucm91bmQoZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCAqIDEwMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBvblByb2dyZXNzKDEwMCk7XG4gICAgICAgICAgICBpZiAoYmFzZTY0ZW5jb2RlKSB7XG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKGZwLmJhc2U2NC5lbmNvZGUoZXZ0LnRhcmdldC5yZXN1bHQsIGFzVGV4dCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZXZ0LnRhcmdldC5yZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgc3dpdGNoIChldnQudGFyZ2V0LmVycm9yLmNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSBldnQudGFyZ2V0LmVycm9yLk5PVF9GT1VORF9FUlI6XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTE1KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgY2FzZSBldnQudGFyZ2V0LmVycm9yLk5PVF9SRUFEQUJMRV9FUlI6XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTE2KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgY2FzZSBldnQudGFyZ2V0LmVycm9yLkFCT1JUX0VSUjpcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMTcpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDExOCkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAoYXNUZXh0IHx8ICFyZWFkZXIucmVhZEFzQmluYXJ5U3RyaW5nKSB7XG4gICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlYWRlci5yZWFkQXNCaW5hcnlTdHJpbmcoZmlsZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciB3cml0ZURhdGFUb0ZQVXJsID0gZnVuY3Rpb24oZnBfdXJsLCBpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIHZhciBtaW1ldHlwZSA9IG9wdGlvbnMubWltZXR5cGUgfHwgXCJ0ZXh0L3BsYWluXCI7XG4gICAgICAgIGZwLmFqYXgucG9zdChmcC51cmxzLmNvbnN0cnVjdFdyaXRlVXJsKGZwX3VybCwgb3B0aW9ucyksIHtcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBtaW1ldHlwZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRhdGE6IGlucHV0LFxuICAgICAgICAgICAgcHJvY2Vzc0RhdGE6IGZhbHNlLFxuICAgICAgICAgICAganNvbjogdHJ1ZSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZnAudXRpbC5zdGFuZGFyZGl6ZUZQRmlsZShqc29uKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKG1zZywgc3RhdHVzLCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjIpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfYXV0aG9yaXplZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9ncmVzczogb25Qcm9ncmVzc1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHZhciB3cml0ZUZpbGVJbnB1dFRvRlBVcmwgPSBmdW5jdGlvbihmcF91cmwsIGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgdmFyIGVycm9yID0gZnVuY3Rpb24obXNnLCBzdGF0dXMsIHhocikge1xuICAgICAgICAgICAgaWYgKG1zZyA9PT0gXCJub3RfZm91bmRcIikge1xuICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwiYmFkX3BhcmFtc1wiKSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIyKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfYXV0aG9yaXplZFwiKSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoNDAzKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB2YXIgc3VjY2VzcyA9IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgIG9uU3VjY2VzcyhmcC51dGlsLnN0YW5kYXJkaXplRlBGaWxlKGpzb24pKTtcbiAgICAgICAgfTtcbiAgICAgICAgdXBsb2FkRmlsZShpbnB1dCwgZnAudXJscy5jb25zdHJ1Y3RXcml0ZVVybChmcF91cmwsIG9wdGlvbnMpLCBzdWNjZXNzLCBlcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgfTtcbiAgICB2YXIgd3JpdGVGaWxlVG9GUFVybCA9IGZ1bmN0aW9uKGZwX3VybCwgaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICB2YXIgZXJyb3IgPSBmdW5jdGlvbihtc2csIHN0YXR1cywgeGhyKSB7XG4gICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIxKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJiYWRfcGFyYW1zXCIpIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjIpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9hdXRob3JpemVkXCIpIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcig0MDMpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZhciBzdWNjZXNzID0gZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgb25TdWNjZXNzKGZwLnV0aWwuc3RhbmRhcmRpemVGUEZpbGUoanNvbikpO1xuICAgICAgICB9O1xuICAgICAgICBvcHRpb25zLm1pbWV0eXBlID0gaW5wdXQudHlwZTtcbiAgICAgICAgdXBsb2FkRmlsZShpbnB1dCwgZnAudXJscy5jb25zdHJ1Y3RXcml0ZVVybChmcF91cmwsIG9wdGlvbnMpLCBzdWNjZXNzLCBlcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgfTtcbiAgICB2YXIgd3JpdGVVcmxUb0ZQVXJsID0gZnVuY3Rpb24oZnBfdXJsLCBpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGZwLmFqYXgucG9zdChmcC51cmxzLmNvbnN0cnVjdFdyaXRlVXJsKGZwX3VybCwgb3B0aW9ucyksIHtcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGlucHV0XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAganNvbjogdHJ1ZSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZnAudXRpbC5zdGFuZGFyZGl6ZUZQRmlsZShqc29uKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKG1zZywgc3RhdHVzLCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjIpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfYXV0aG9yaXplZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9ncmVzczogb25Qcm9ncmVzc1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHZhciBzdG9yZUZpbGVJbnB1dCA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgaWYgKGlucHV0LmZpbGVzKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuZmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTE1KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0b3JlRmlsZShpbnB1dC5maWxlc1swXSwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmcC51dGlsLnNldERlZmF1bHQob3B0aW9ucywgXCJsb2NhdGlvblwiLCBcIlMzXCIpO1xuICAgICAgICBpZiAoIW9wdGlvbnMuZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuZmlsZW5hbWUgPSBpbnB1dC52YWx1ZS5yZXBsYWNlKFwiQzpcXFxcZmFrZXBhdGhcXFxcXCIsIFwiXCIpIHx8IGlucHV0Lm5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9sZF9uYW1lID0gaW5wdXQubmFtZTtcbiAgICAgICAgaW5wdXQubmFtZSA9IFwiZmlsZVVwbG9hZFwiO1xuICAgICAgICBmcC5pZnJhbWVBamF4LnBvc3QoZnAudXJscy5jb25zdHJ1Y3RTdG9yZVVybChvcHRpb25zKSwge1xuICAgICAgICAgICAgZGF0YTogaW5wdXQsXG4gICAgICAgICAgICBwcm9jZXNzRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBqc29uOiB0cnVlLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgIGlucHV0Lm5hbWUgPSBvbGRfbmFtZTtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZnAudXRpbC5zdGFuZGFyZGl6ZUZQRmlsZShqc29uKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKG1zZywgc3RhdHVzLCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjIpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfYXV0aG9yaXplZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICB2YXIgc3RvcmVGaWxlID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBmcC51dGlsLnNldERlZmF1bHQob3B0aW9ucywgXCJsb2NhdGlvblwiLCBcIlMzXCIpO1xuICAgICAgICB2YXIgZXJyb3IgPSBmdW5jdGlvbihtc2csIHN0YXR1cywgeGhyKSB7XG4gICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIxKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJiYWRfcGFyYW1zXCIpIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjIpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9hdXRob3JpemVkXCIpIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcig0MDMpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnAudXRpbC5jb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZhciBzdWNjZXNzID0gZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgb25TdWNjZXNzKGZwLnV0aWwuc3RhbmRhcmRpemVGUEZpbGUoanNvbikpO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoIW9wdGlvbnMuZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuZmlsZW5hbWUgPSBpbnB1dC5uYW1lIHx8IGlucHV0LmZpbGVOYW1lO1xuICAgICAgICB9XG4gICAgICAgIHVwbG9hZEZpbGUoaW5wdXQsIGZwLnVybHMuY29uc3RydWN0U3RvcmVVcmwob3B0aW9ucyksIHN1Y2Nlc3MsIGVycm9yLCBvblByb2dyZXNzKTtcbiAgICB9O1xuICAgIHZhciB1cGxvYWRGaWxlID0gZnVuY3Rpb24oZmlsZSwgdXJsLCBzdWNjZXNzLCBlcnJvciwgcHJvZ3Jlc3MpIHtcbiAgICAgICAgaWYgKGZpbGUuZmlsZXMpIHtcbiAgICAgICAgICAgIGZpbGUgPSBmaWxlLmZpbGVzWzBdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBodG1sNVVwbG9hZCA9ICEhd2luZG93LkZvcm1EYXRhICYmICEhd2luZG93LlhNTEh0dHBSZXF1ZXN0O1xuICAgICAgICBpZiAoaHRtbDVVcGxvYWQpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gbmV3IHdpbmRvdy5Gb3JtRGF0YSgpO1xuICAgICAgICAgICAgZGF0YS5hcHBlbmQoXCJmaWxlVXBsb2FkXCIsIGZpbGUpO1xuICAgICAgICAgICAgZnAuYWpheC5wb3N0KHVybCwge1xuICAgICAgICAgICAgICAgIGpzb246IHRydWUsXG4gICAgICAgICAgICAgICAgcHJvY2Vzc0RhdGE6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICAgICAgc3VjY2Vzczogc3VjY2VzcyxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IsXG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3M6IHByb2dyZXNzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZwLmlmcmFtZUFqYXgucG9zdCh1cmwsIHtcbiAgICAgICAgICAgICAgICBkYXRhOiBmaWxlLFxuICAgICAgICAgICAgICAgIGpzb246IHRydWUsXG4gICAgICAgICAgICAgICAgc3VjY2Vzczogc3VjY2VzcyxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3JcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgc3RvcmVEYXRhID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBmcC51dGlsLnNldERlZmF1bHQob3B0aW9ucywgXCJsb2NhdGlvblwiLCBcIlMzXCIpO1xuICAgICAgICBmcC51dGlsLnNldERlZmF1bHQob3B0aW9ucywgXCJtaW1ldHlwZVwiLCBcInRleHQvcGxhaW5cIik7XG4gICAgICAgIGZwLmFqYXgucG9zdChmcC51cmxzLmNvbnN0cnVjdFN0b3JlVXJsKG9wdGlvbnMpLCB7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogb3B0aW9ucy5taW1ldHlwZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRhdGE6IGlucHV0LFxuICAgICAgICAgICAgcHJvY2Vzc0RhdGE6IGZhbHNlLFxuICAgICAgICAgICAganNvbjogdHJ1ZSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZnAudXRpbC5zdGFuZGFyZGl6ZUZQRmlsZShqc29uKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKG1zZywgc3RhdHVzLCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjIpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfYXV0aG9yaXplZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9ncmVzczogb25Qcm9ncmVzc1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHZhciBzdG9yZVVybCA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgZnAudXRpbC5zZXREZWZhdWx0KG9wdGlvbnMsIFwibG9jYXRpb25cIiwgXCJTM1wiKTtcbiAgICAgICAgZnAuYWpheC5wb3N0KGZwLnVybHMuY29uc3RydWN0U3RvcmVVcmwob3B0aW9ucyksIHtcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGZwLnV0aWwuZ2V0RlBVcmwoaW5wdXQpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAganNvbjogdHJ1ZSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZnAudXRpbC5zdGFuZGFyZGl6ZUZQRmlsZShqc29uKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKG1zZywgc3RhdHVzLCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDE1MSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxNTIpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfYXV0aG9yaXplZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDE1MykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9ncmVzczogb25Qcm9ncmVzc1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHZhciBzdGF0ID0gZnVuY3Rpb24oZnBfdXJsLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IpIHtcbiAgICAgICAgdmFyIGRhdGVwYXJhbXMgPSBbIFwidXBsb2FkZWRcIiwgXCJtb2RpZmllZFwiLCBcImNyZWF0ZWRcIiBdO1xuICAgICAgICBpZiAob3B0aW9ucy5jYWNoZSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5fY2FjaGVCdXN0ID0gZnAudXRpbC5nZXRJZCgpO1xuICAgICAgICB9XG4gICAgICAgIGZwLmFqYXguZ2V0KGZwX3VybCArIFwiL21ldGFkYXRhXCIsIHtcbiAgICAgICAgICAgIGpzb246IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBvcHRpb25zLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24obWV0YWRhdGEpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGVwYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGFkYXRhW2RhdGVwYXJhbXNbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YVtkYXRlcGFyYW1zW2ldXSA9IG5ldyBEYXRlKG1ldGFkYXRhW2RhdGVwYXJhbXNbaV1dKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MobWV0YWRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbihtc2csIHN0YXR1cywgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1zZyA9PT0gXCJub3RfZm91bmRcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxNjEpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJiYWRfcGFyYW1zXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoNDAwKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwibm90X2F1dGhvcml6ZWRcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcig0MDMpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxNjIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgdmFyIHJlbW92ZSA9IGZ1bmN0aW9uKGZwX3VybCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yKSB7XG4gICAgICAgIG9wdGlvbnMua2V5ID0gZnAuYXBpa2V5O1xuICAgICAgICBmcC5hamF4LnBvc3QoZnBfdXJsICsgXCIvcmVtb3ZlXCIsIHtcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMsXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXNwKSB7XG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKG1zZywgc3RhdHVzLCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDE3MSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcig0MDApKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfYXV0aG9yaXplZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDE3MikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICByZWFkRnJvbVVybDogcmVhZEZyb21VcmwsXG4gICAgICAgIHJlYWRGcm9tRmlsZTogcmVhZEZyb21GaWxlLFxuICAgICAgICByZWFkRnJvbUZQVXJsOiByZWFkRnJvbUZQVXJsLFxuICAgICAgICB3cml0ZURhdGFUb0ZQVXJsOiB3cml0ZURhdGFUb0ZQVXJsLFxuICAgICAgICB3cml0ZUZpbGVUb0ZQVXJsOiB3cml0ZUZpbGVUb0ZQVXJsLFxuICAgICAgICB3cml0ZUZpbGVJbnB1dFRvRlBVcmw6IHdyaXRlRmlsZUlucHV0VG9GUFVybCxcbiAgICAgICAgd3JpdGVVcmxUb0ZQVXJsOiB3cml0ZVVybFRvRlBVcmwsXG4gICAgICAgIHN0b3JlRmlsZUlucHV0OiBzdG9yZUZpbGVJbnB1dCxcbiAgICAgICAgc3RvcmVGaWxlOiBzdG9yZUZpbGUsXG4gICAgICAgIHN0b3JlVXJsOiBzdG9yZVVybCxcbiAgICAgICAgc3RvcmVEYXRhOiBzdG9yZURhdGEsXG4gICAgICAgIHN0YXQ6IHN0YXQsXG4gICAgICAgIHJlbW92ZTogcmVtb3ZlXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJpZnJhbWVBamF4XCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIElGUkFNRV9JRCA9IFwiYWpheF9pZnJhbWVcIjtcbiAgICB2YXIgcXVldWUgPSBbXTtcbiAgICB2YXIgcnVubmluZyA9IGZhbHNlO1xuICAgIHZhciBnZXRfcmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zLm1ldGhvZCA9IFwiR0VUXCI7XG4gICAgICAgIG1ha2VfcmVxdWVzdCh1cmwsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdmFyIHBvc3RfcmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zLm1ldGhvZCA9IFwiUE9TVFwiO1xuICAgICAgICB1cmwgKz0gKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwID8gXCImXCIgOiBcIj9cIikgKyBcIl9jYWNoZUJ1c3Q9XCIgKyBmcC51dGlsLmdldElkKCk7XG4gICAgICAgIG1ha2VfcmVxdWVzdCh1cmwsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdmFyIHJ1blF1ZXVlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICBtYWtlX3JlcXVlc3QobmV4dC51cmwsIG5leHQub3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBtYWtlX3JlcXVlc3QgPSBmdW5jdGlvbih1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKHJ1bm5pbmcpIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goe1xuICAgICAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHVybCArPSAodXJsLmluZGV4T2YoXCI/XCIpID49IDAgPyBcIiZcIiA6IFwiP1wiKSArIFwicGx1Z2luPVwiICsgZnAudXJscy5nZXRQbHVnaW4oKSArIFwiJl9jYWNoZUJ1c3Q9XCIgKyBmcC51dGlsLmdldElkKCk7XG4gICAgICAgIHVybCArPSBcIiZDb250ZW50LVR5cGU9dGV4dCUyRmh0bWxcIjtcbiAgICAgICAgZnAuY29tbS5vcGVuQ2hhbm5lbCgpO1xuICAgICAgICB2YXIgdXBsb2FkSUZyYW1lO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdXBsb2FkSUZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnPGlmcmFtZSBuYW1lPVwiJyArIElGUkFNRV9JRCArICdcIj4nKTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgIHVwbG9hZElGcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpZnJhbWVcIik7XG4gICAgICAgIH1cbiAgICAgICAgdXBsb2FkSUZyYW1lLmlkID0gdXBsb2FkSUZyYW1lLm5hbWUgPSBJRlJBTUVfSUQ7XG4gICAgICAgIHVwbG9hZElGcmFtZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIHZhciByZWxlYXNlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIH07XG4gICAgICAgIGlmICh1cGxvYWRJRnJhbWUuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgIHVwbG9hZElGcmFtZS5hdHRhY2hFdmVudChcIm9ubG9hZFwiLCByZWxlYXNlKTtcbiAgICAgICAgICAgIHVwbG9hZElGcmFtZS5hdHRhY2hFdmVudChcIm9uZXJyb3JcIiwgcmVsZWFzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cGxvYWRJRnJhbWUub25lcnJvciA9IHVwbG9hZElGcmFtZS5vbmxvYWQgPSByZWxlYXNlO1xuICAgICAgICB9XG4gICAgICAgIHVwbG9hZElGcmFtZS5pZCA9IElGUkFNRV9JRDtcbiAgICAgICAgdXBsb2FkSUZyYW1lLm5hbWUgPSBJRlJBTUVfSUQ7XG4gICAgICAgIHVwbG9hZElGcmFtZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIHVwbG9hZElGcmFtZS5vbmVycm9yID0gdXBsb2FkSUZyYW1lLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcnVubmluZyA9IGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHVwbG9hZElGcmFtZSk7XG4gICAgICAgIGZwLmhhbmRsZXJzLmF0dGFjaChcInVwbG9hZFwiLCBnZXRSZWNlaXZlVXBsb2FkTWVzc2FnZShvcHRpb25zKSk7XG4gICAgICAgIHZhciBmb3JtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImZvcm1cIik7XG4gICAgICAgIGZvcm0ubWV0aG9kID0gb3B0aW9ucy5tZXRob2QgfHwgXCJHRVRcIjtcbiAgICAgICAgZm9ybS5hY3Rpb24gPSB1cmw7XG4gICAgICAgIGZvcm0udGFyZ2V0ID0gSUZSQU1FX0lEO1xuICAgICAgICB2YXIgZGF0YSA9IG9wdGlvbnMuZGF0YTtcbiAgICAgICAgaWYgKGZwLnV0aWwuaXNGaWxlSW5wdXRFbGVtZW50KGRhdGEpIHx8IGZwLnV0aWwuaXNGaWxlKGRhdGEpKSB7XG4gICAgICAgICAgICBmb3JtLmVuY29kaW5nID0gZm9ybS5lbmN0eXBlID0gXCJtdWx0aXBhcnQvZm9ybS1kYXRhXCI7XG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChmb3JtKTtcbiAgICAgICAgdmFyIGlucHV0O1xuICAgICAgICBpZiAoZnAudXRpbC5pc0ZpbGUoZGF0YSkpIHtcbiAgICAgICAgICAgIHZhciBmaWxlX2lucHV0ID0gZ2V0SW5wdXRGb3JGaWxlKGRhdGEpO1xuICAgICAgICAgICAgaWYgKCFmaWxlX2lucHV0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkNvdWxkbid0IGZpbmQgY29ycmVzcG9uZGluZyBmaWxlIGlucHV0LlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgZmlsZVVwbG9hZDogZmlsZV9pbnB1dFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChmcC51dGlsLmlzRmlsZUlucHV0RWxlbWVudChkYXRhKSkge1xuICAgICAgICAgICAgaW5wdXQgPSBkYXRhO1xuICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICAgICAgZGF0YS5maWxlVXBsb2FkID0gaW5wdXQ7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YSAmJiBmcC51dGlsLmlzRWxlbWVudChkYXRhKSAmJiBkYXRhLnRhZ05hbWUgPT09IFwiSU5QVVRcIikge1xuICAgICAgICAgICAgaW5wdXQgPSBkYXRhO1xuICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICAgICAgZGF0YVtpbnB1dC5uYW1lXSA9IGlucHV0O1xuICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMucHJvY2Vzc0RhdGEgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZGF0YS5mb3JtYXQgPSBcImlmcmFtZVwiO1xuICAgICAgICB2YXIgaW5wdXRfY2FjaGUgPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGRhdGEpIHtcbiAgICAgICAgICAgIHZhciB2YWwgPSBkYXRhW2tleV07XG4gICAgICAgICAgICBpZiAoZnAudXRpbC5pc0VsZW1lbnQodmFsKSAmJiB2YWwudGFnTmFtZSA9PT0gXCJJTlBVVFwiKSB7XG4gICAgICAgICAgICAgICAgaW5wdXRfY2FjaGVba2V5XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgcGFyOiB2YWwucGFyZW50Tm9kZSxcbiAgICAgICAgICAgICAgICAgICAgc2liOiB2YWwubmV4dFNpYmxpbmcsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHZhbC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBpbnB1dDogdmFsLFxuICAgICAgICAgICAgICAgICAgICBmb2N1c2VkOiB2YWwgPT09IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhbC5uYW1lID0ga2V5O1xuICAgICAgICAgICAgICAgIGZvcm0uYXBwZW5kQ2hpbGQodmFsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGlucHV0X3ZhbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcbiAgICAgICAgICAgICAgICBpbnB1dF92YWwubmFtZSA9IGtleTtcbiAgICAgICAgICAgICAgICBpbnB1dF92YWwudmFsdWUgPSB2YWw7XG4gICAgICAgICAgICAgICAgZm9ybS5hcHBlbmRDaGlsZChpbnB1dF92YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJ1bm5pbmcgPSB0cnVlO1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZvcm0uc3VibWl0KCk7XG4gICAgICAgICAgICBmb3IgKHZhciBjYWNoZV9rZXkgaW4gaW5wdXRfY2FjaGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2FjaGVfdmFsID0gaW5wdXRfY2FjaGVbY2FjaGVfa2V5XTtcbiAgICAgICAgICAgICAgICBjYWNoZV92YWwucGFyLmluc2VydEJlZm9yZShjYWNoZV92YWwuaW5wdXQsIGNhY2hlX3ZhbC5zaWIpO1xuICAgICAgICAgICAgICAgIGNhY2hlX3ZhbC5pbnB1dC5uYW1lID0gY2FjaGVfdmFsLm5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKGNhY2hlX3ZhbC5mb2N1c2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlX3ZhbC5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvcm0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChmb3JtKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfTtcbiAgICB2YXIgZ2V0UmVjZWl2ZVVwbG9hZE1lc3NhZ2UgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBzdWNjZXNzID0gb3B0aW9ucy5zdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBlcnJvciA9IG9wdGlvbnMuZXJyb3IgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS50eXBlICE9PSBcIlVwbG9hZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcnVubmluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0gZGF0YS5wYXlsb2FkO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IocmVzcG9uc2UuZXJyb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZwLmhhbmRsZXJzLmRldGFjaChcInVwbG9hZFwiKTtcbiAgICAgICAgICAgIHJ1blF1ZXVlKCk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgIH07XG4gICAgdmFyIGdldElucHV0Rm9yRmlsZSA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAgICAgdmFyIGlucHV0cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5wdXRcIik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5wdXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaW5wdXQgPSBpbnB1dHNbMF07XG4gICAgICAgICAgICBpZiAoaW5wdXQudHlwZSAhPT0gXCJmaWxlXCIgfHwgIWlucHV0LmZpbGVzIHx8ICFpbnB1dC5maWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgaW5wdXQuZmlsZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuZmlsZXNbal0gPT09IGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIGdldDogZ2V0X3JlcXVlc3QsXG4gICAgICAgIHBvc3Q6IHBvc3RfcmVxdWVzdCxcbiAgICAgICAgcmVxdWVzdDogbWFrZV9yZXF1ZXN0XG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJiYXNlNjRcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgX2tleVN0ciA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz1cIjtcbiAgICB2YXIgZW5jb2RlID0gZnVuY3Rpb24oaW5wdXQsIHV0ZjhlbmNvZGUpIHtcbiAgICAgICAgdXRmOGVuY29kZSA9IHV0ZjhlbmNvZGUgfHwgdXRmOGVuY29kZSA9PT0gdW5kZWZpbmVkO1xuICAgICAgICB2YXIgb3V0cHV0ID0gXCJcIjtcbiAgICAgICAgdmFyIGNocjEsIGNocjIsIGNocjMsIGVuYzEsIGVuYzIsIGVuYzMsIGVuYzQ7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgaWYgKHV0ZjhlbmNvZGUpIHtcbiAgICAgICAgICAgIGlucHV0ID0gX3V0ZjhfZW5jb2RlKGlucHV0KTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoaSA8IGlucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY2hyMSA9IGlucHV0LmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICBjaHIyID0gaW5wdXQuY2hhckNvZGVBdChpICsgMSk7XG4gICAgICAgICAgICBjaHIzID0gaW5wdXQuY2hhckNvZGVBdChpICsgMik7XG4gICAgICAgICAgICBpICs9IDM7XG4gICAgICAgICAgICBlbmMxID0gY2hyMSA+PiAyO1xuICAgICAgICAgICAgZW5jMiA9IChjaHIxICYgMykgPDwgNCB8IGNocjIgPj4gNDtcbiAgICAgICAgICAgIGVuYzMgPSAoY2hyMiAmIDE1KSA8PCAyIHwgY2hyMyA+PiA2O1xuICAgICAgICAgICAgZW5jNCA9IGNocjMgJiA2MztcbiAgICAgICAgICAgIGlmIChpc05hTihjaHIyKSkge1xuICAgICAgICAgICAgICAgIGVuYzMgPSBlbmM0ID0gNjQ7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTmFOKGNocjMpKSB7XG4gICAgICAgICAgICAgICAgZW5jNCA9IDY0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0cHV0ID0gb3V0cHV0ICsgX2tleVN0ci5jaGFyQXQoZW5jMSkgKyBfa2V5U3RyLmNoYXJBdChlbmMyKSArIF9rZXlTdHIuY2hhckF0KGVuYzMpICsgX2tleVN0ci5jaGFyQXQoZW5jNCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9O1xuICAgIHZhciBkZWNvZGUgPSBmdW5jdGlvbihpbnB1dCwgdXRmOGRlY29kZSkge1xuICAgICAgICB1dGY4ZGVjb2RlID0gdXRmOGRlY29kZSB8fCB1dGY4ZGVjb2RlID09PSB1bmRlZmluZWQ7XG4gICAgICAgIHZhciBvdXRwdXQgPSBcIlwiO1xuICAgICAgICB2YXIgY2hyMSwgY2hyMiwgY2hyMztcbiAgICAgICAgdmFyIGVuYzEsIGVuYzIsIGVuYzMsIGVuYzQ7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgaW5wdXQgPSBpbnB1dC5yZXBsYWNlKC9bXkEtWmEtejAtOVxcK1xcL1xcPV0vZywgXCJcIik7XG4gICAgICAgIHdoaWxlIChpIDwgaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICBlbmMxID0gX2tleVN0ci5pbmRleE9mKGlucHV0LmNoYXJBdChpKSk7XG4gICAgICAgICAgICBlbmMyID0gX2tleVN0ci5pbmRleE9mKGlucHV0LmNoYXJBdChpICsgMSkpO1xuICAgICAgICAgICAgZW5jMyA9IF9rZXlTdHIuaW5kZXhPZihpbnB1dC5jaGFyQXQoaSArIDIpKTtcbiAgICAgICAgICAgIGVuYzQgPSBfa2V5U3RyLmluZGV4T2YoaW5wdXQuY2hhckF0KGkgKyAzKSk7XG4gICAgICAgICAgICBpICs9IDQ7XG4gICAgICAgICAgICBjaHIxID0gZW5jMSA8PCAyIHwgZW5jMiA+PiA0O1xuICAgICAgICAgICAgY2hyMiA9IChlbmMyICYgMTUpIDw8IDQgfCBlbmMzID4+IDI7XG4gICAgICAgICAgICBjaHIzID0gKGVuYzMgJiAzKSA8PCA2IHwgZW5jNDtcbiAgICAgICAgICAgIG91dHB1dCA9IG91dHB1dCArIFN0cmluZy5mcm9tQ2hhckNvZGUoY2hyMSk7XG4gICAgICAgICAgICBpZiAoZW5jMyAhPSA2NCkge1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IG91dHB1dCArIFN0cmluZy5mcm9tQ2hhckNvZGUoY2hyMik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZW5jNCAhPSA2NCkge1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IG91dHB1dCArIFN0cmluZy5mcm9tQ2hhckNvZGUoY2hyMyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHV0ZjhkZWNvZGUpIHtcbiAgICAgICAgICAgIG91dHB1dCA9IF91dGY4X2RlY29kZShvdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfTtcbiAgICB2YXIgX3V0ZjhfZW5jb2RlID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKC9cXHJcXG4vZywgXCJcXG5cIik7XG4gICAgICAgIHZhciB1dGZ0ZXh0ID0gXCJcIjtcbiAgICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCBzdHJpbmcubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgIHZhciBjID0gc3RyaW5nLmNoYXJDb2RlQXQobik7XG4gICAgICAgICAgICBpZiAoYyA8IDEyOCkge1xuICAgICAgICAgICAgICAgIHV0ZnRleHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYyA+IDEyNyAmJiBjIDwgMjA0OCkge1xuICAgICAgICAgICAgICAgIHV0ZnRleHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjID4+IDYgfCAxOTIpO1xuICAgICAgICAgICAgICAgIHV0ZnRleHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjICYgNjMgfCAxMjgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB1dGZ0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyA+PiAxMiB8IDIyNCk7XG4gICAgICAgICAgICAgICAgdXRmdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgPj4gNiAmIDYzIHwgMTI4KTtcbiAgICAgICAgICAgICAgICB1dGZ0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyAmIDYzIHwgMTI4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXRmdGV4dDtcbiAgICB9O1xuICAgIHZhciBfdXRmOF9kZWNvZGUgPSBmdW5jdGlvbih1dGZ0ZXh0KSB7XG4gICAgICAgIHZhciBzdHJpbmcgPSBcIlwiLCBpID0gMCwgYyA9IDAsIGMyID0gMCwgYzMgPSAwO1xuICAgICAgICB3aGlsZSAoaSA8IHV0ZnRleHQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjID0gdXRmdGV4dC5jaGFyQ29kZUF0KGkpO1xuICAgICAgICAgICAgaWYgKGMgPCAxMjgpIHtcbiAgICAgICAgICAgICAgICBzdHJpbmcgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGMgPiAxOTEgJiYgYyA8IDIyNCkge1xuICAgICAgICAgICAgICAgIGMyID0gdXRmdGV4dC5jaGFyQ29kZUF0KGkgKyAxKTtcbiAgICAgICAgICAgICAgICBzdHJpbmcgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYyAmIDMxKSA8PCA2IHwgYzIgJiA2Myk7XG4gICAgICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjMiA9IHV0ZnRleHQuY2hhckNvZGVBdChpICsgMSk7XG4gICAgICAgICAgICAgICAgYzMgPSB1dGZ0ZXh0LmNoYXJDb2RlQXQoaSArIDIpO1xuICAgICAgICAgICAgICAgIHN0cmluZyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjICYgMTUpIDw8IDEyIHwgKGMyICYgNjMpIDw8IDYgfCBjMyAmIDYzKTtcbiAgICAgICAgICAgICAgICBpICs9IDM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIGVuY29kZTogZW5jb2RlLFxuICAgICAgICBkZWNvZGU6IGRlY29kZVxuICAgIH07XG59LCB0cnVlKTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwiYnJvd3NlclwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBpc0lPUyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gISEobmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBob25lL2kpIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL2lQb2QvaSkgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBhZC9pKSk7XG4gICAgfTtcbiAgICB2YXIgaXNBbmRyb2lkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAhIW5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0FuZHJvaWQvaSk7XG4gICAgfTtcbiAgICB2YXIgZ2V0TGFuZ3VhZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGxhbmd1YWdlID0gd2luZG93Lm5hdmlnYXRvci51c2VyTGFuZ3VhZ2UgfHwgd2luZG93Lm5hdmlnYXRvci5sYW5ndWFnZTtcbiAgICAgICAgaWYgKGxhbmd1YWdlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxhbmd1YWdlID0gXCJlblwiO1xuICAgICAgICB9XG4gICAgICAgIGxhbmd1YWdlID0gbGFuZ3VhZ2UucmVwbGFjZShcIi1cIiwgXCJfXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHJldHVybiBsYW5ndWFnZTtcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIGdldExhbmd1YWdlOiBnZXRMYW5ndWFnZSxcbiAgICAgICAgb3BlbkluTW9kYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICEoaXNJT1MoKSB8fCBpc0FuZHJvaWQoKSkgfHwgISF3aW5kb3cubmF2aWdhdG9yLnN0YW5kYWxvbmU7XG4gICAgICAgIH0sXG4gICAgICAgIGlzTW9iaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0lPUygpIHx8IGlzQW5kcm9pZCgpO1xuICAgICAgICB9XG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJjb252ZXJzaW9uc1V0aWxcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcywgQ09OVkVSU0lPTl9ET01BSU4gPSBmcC51cmxzLkJBU0UucmVwbGFjZShcInd3d1wiLCBcInByb2Nlc3NcIikgKyBcIi9cIjtcbiAgICB2YXIgcGFyc2VDb252ZXJzaW9uVXJsID0gZnVuY3Rpb24ocHJvY2Vzc1VybCkge1xuICAgICAgICBpZiAoIXByb2Nlc3NVcmwpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdXJsOiBudWxsLFxuICAgICAgICAgICAgICAgIG9wdGlvbnNEaWN0OiB7fVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzVXJsID0gcHJvY2Vzc1VybC5yZXBsYWNlKENPTlZFUlNJT05fRE9NQUlOLCBcIlwiKTtcbiAgICAgICAgdmFyIG9yaWdpbmFsVXJsID0gcHJvY2Vzc1VybC5zdWJzdHJpbmcocHJvY2Vzc1VybC5pbmRleE9mKFwiL2h0dHBcIikgKyAxKTtcbiAgICAgICAgcHJvY2Vzc1VybCA9IHByb2Nlc3NVcmwucmVwbGFjZShcIi9cIiArIG9yaWdpbmFsVXJsLCBcIlwiKTtcbiAgICAgICAgdmFyIGFwaWtleSA9IHByb2Nlc3NVcmwuc3Vic3RyaW5nKDAsIHByb2Nlc3NVcmwuaW5kZXhPZihcIi9cIikpO1xuICAgICAgICBwcm9jZXNzVXJsID0gcHJvY2Vzc1VybC5yZXBsYWNlKGFwaWtleSArIFwiL1wiLCBcIlwiKTtcbiAgICAgICAgdmFyIHNlZ21lbnRzID0gcHJvY2Vzc1VybC5zcGxpdChcIi9cIiksIG9wdGlvbnNEaWN0ID0ge30sIG1ham9yT3B0aW9uLCBtaW5vck9wdGlvbnMsIG1pbm9yT3B0aW9uLCBpLCBqO1xuICAgICAgICBmb3IgKGkgaW4gc2VnbWVudHMpIHtcbiAgICAgICAgICAgIG1ham9yT3B0aW9uID0gc2VnbWVudHNbaV0uc3BsaXQoXCI9XCIpO1xuICAgICAgICAgICAgaWYgKG1ham9yT3B0aW9uLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zRGljdFttYWpvck9wdGlvblswXV0gPSB7fTtcbiAgICAgICAgICAgICAgICBtaW5vck9wdGlvbnMgPSBtYWpvck9wdGlvblsxXS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICAgICAgZm9yIChqIGluIG1pbm9yT3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICBtaW5vck9wdGlvbiA9IG1pbm9yT3B0aW9uc1tqXS5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtaW5vck9wdGlvbi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zRGljdFttYWpvck9wdGlvblswXV1bbWlub3JPcHRpb25bMF1dID0gbWlub3JPcHRpb25bMV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNlZ21lbnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uc0RpY3Rbc2VnbWVudHNbaV1dID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdXJsOiBvcmlnaW5hbFVybCxcbiAgICAgICAgICAgIGFwaWtleTogYXBpa2V5LFxuICAgICAgICAgICAgb3B0aW9uc0RpY3Q6IG9wdGlvbnNEaWN0XG4gICAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgYnVpbGRDb252ZXJzaW9uVXJsID0gZnVuY3Rpb24ob3JpZ2luYWxVcmwsIG9wdGlvbnNEaWN0LCBhcGlrZXkpIHtcbiAgICAgICAgdmFyIGNvbnZlcnNpb25VcmwgPSBDT05WRVJTSU9OX0RPTUFJTiArIGFwaWtleSwgbWFqb3JPcHRpb24sIG1pbm9yT3B0aW9uLCBsZW5ndGg7XG4gICAgICAgIG9wdGlvbnNEaWN0ID0gb3B0aW9uc0RpY3QgfHwge307XG4gICAgICAgIGZvciAobWFqb3JPcHRpb24gaW4gb3B0aW9uc0RpY3QpIHtcbiAgICAgICAgICAgIGNvbnZlcnNpb25VcmwgKz0gXCIvXCIgKyBtYWpvck9wdGlvbjtcbiAgICAgICAgICAgIGxlbmd0aCA9IGZwLnV0aWwub2JqZWN0S2V5cyhvcHRpb25zRGljdFttYWpvck9wdGlvbl0gfHwge30pLmxlbmd0aDtcbiAgICAgICAgICAgIGlmIChsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJzaW9uVXJsICs9IFwiPVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChtaW5vck9wdGlvbiBpbiBvcHRpb25zRGljdFttYWpvck9wdGlvbl0pIHtcbiAgICAgICAgICAgICAgICBjb252ZXJzaW9uVXJsICs9IG1pbm9yT3B0aW9uICsgXCI6XCIgKyBvcHRpb25zRGljdFttYWpvck9wdGlvbl1bbWlub3JPcHRpb25dO1xuICAgICAgICAgICAgICAgIGlmICgtLWxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb252ZXJzaW9uVXJsICs9IFwiLFwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb252ZXJzaW9uVXJsICs9IFwiL1wiICsgb3JpZ2luYWxVcmw7XG4gICAgICAgIHJldHVybiBjb252ZXJzaW9uVXJsO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgQ09OVkVSU0lPTl9ET01BSU46IENPTlZFUlNJT05fRE9NQUlOLFxuICAgICAgICBwYXJzZVVybDogcGFyc2VDb252ZXJzaW9uVXJsLFxuICAgICAgICBidWlsZFVybDogYnVpbGRDb252ZXJzaW9uVXJsXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJqc29uXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIHNwZWNpYWwgPSB7XG4gICAgICAgIFwiXFxiXCI6IFwiXFxcXGJcIixcbiAgICAgICAgXCJcdFwiOiBcIlxcXFx0XCIsXG4gICAgICAgIFwiXFxuXCI6IFwiXFxcXG5cIixcbiAgICAgICAgXCJcXGZcIjogXCJcXFxcZlwiLFxuICAgICAgICBcIlxcclwiOiBcIlxcXFxyXCIsXG4gICAgICAgICdcIic6ICdcXFxcXCInLFxuICAgICAgICBcIlxcXFxcIjogXCJcXFxcXFxcXFwiXG4gICAgfTtcbiAgICB2YXIgZXNjYXBlID0gZnVuY3Rpb24oY2hyKSB7XG4gICAgICAgIHJldHVybiBzcGVjaWFsW2Nocl0gfHwgXCJcXFxcdVwiICsgKFwiMDAwMFwiICsgY2hyLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtNCk7XG4gICAgfTtcbiAgICB2YXIgdmFsaWRhdGUgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UoL1xcXFwoPzpbXCJcXFxcXFwvYmZucnRdfHVbMC05YS1mQS1GXXs0fSkvZywgXCJAXCIpLnJlcGxhY2UoL1wiW15cIlxcXFxcXG5cXHJdKlwifHRydWV8ZmFsc2V8bnVsbHwtP1xcZCsoPzpcXC5cXGQqKT8oPzpbZUVdWytcXC1dP1xcZCspPy9nLCBcIl1cIikucmVwbGFjZSgvKD86Xnw6fCwpKD86XFxzKlxcWykrL2csIFwiXCIpO1xuICAgICAgICByZXR1cm4gL15bXFxdLDp7fVxcc10qJC8udGVzdChzdHJpbmcpO1xuICAgIH07XG4gICAgdmFyIGVuY29kZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBpZiAod2luZG93LkpTT04gJiYgd2luZG93LkpTT04uc3RyaW5naWZ5KSB7XG4gICAgICAgICAgICByZXR1cm4gd2luZG93LkpTT04uc3RyaW5naWZ5KG9iaik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9iaiAmJiBvYmoudG9KU09OKSB7XG4gICAgICAgICAgICBvYmogPSBvYmoudG9KU09OKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN0cmluZyA9IFtdO1xuICAgICAgICBzd2l0Y2ggKGZwLnV0aWwudHlwZU9mKG9iaikpIHtcbiAgICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICByZXR1cm4gJ1wiJyArIG9iai5yZXBsYWNlKC9bXFx4MDAtXFx4MWZcXFxcXCJdL2csIGVzY2FwZSkgKyAnXCInO1xuXG4gICAgICAgICAgY2FzZSBcImFycmF5XCI6XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHN0cmluZy5wdXNoKGVuY29kZShvYmpbaV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBcIltcIiArIHN0cmluZyArIFwiXVwiO1xuXG4gICAgICAgICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgICAgIGNhc2UgXCJoYXNoXCI6XG4gICAgICAgICAgICB2YXIganNvbjtcbiAgICAgICAgICAgIHZhciBrZXk7XG4gICAgICAgICAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBqc29uID0gZW5jb2RlKG9ialtrZXldKTtcbiAgICAgICAgICAgICAgICBpZiAoanNvbikge1xuICAgICAgICAgICAgICAgICAgICBzdHJpbmcucHVzaChlbmNvZGUoa2V5KSArIFwiOlwiICsganNvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGpzb24gPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFwie1wiICsgc3RyaW5nICsgXCJ9XCI7XG5cbiAgICAgICAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgICAgICAgY2FzZSBcImJvb2xlYW5cIjpcbiAgICAgICAgICAgIHJldHVybiBcIlwiICsgb2JqO1xuXG4gICAgICAgICAgY2FzZSBcIm51bGxcIjpcbiAgICAgICAgICAgIHJldHVybiBcIm51bGxcIjtcblxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gXCJudWxsXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcbiAgICB2YXIgZGVjb2RlID0gZnVuY3Rpb24oc3RyaW5nLCBzZWN1cmUpIHtcbiAgICAgICAgaWYgKCFzdHJpbmcgfHwgZnAudXRpbC50eXBlT2Yoc3RyaW5nKSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdpbmRvdy5KU09OICYmIHdpbmRvdy5KU09OLnBhcnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gd2luZG93LkpTT04ucGFyc2Uoc3RyaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChzZWN1cmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXZhbGlkYXRlKHN0cmluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSlNPTiBjb3VsZCBub3QgZGVjb2RlIHRoZSBpbnB1dDsgc2VjdXJpdHkgaXMgZW5hYmxlZCBhbmQgdGhlIHZhbHVlIGlzIG5vdCBzZWN1cmUuXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBldmFsKFwiKFwiICsgc3RyaW5nICsgXCIpXCIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICB2YWxpZGF0ZTogdmFsaWRhdGUsXG4gICAgICAgIGVuY29kZTogZW5jb2RlLFxuICAgICAgICBzdHJpbmdpZnk6IGVuY29kZSxcbiAgICAgICAgZGVjb2RlOiBkZWNvZGUsXG4gICAgICAgIHBhcnNlOiBkZWNvZGVcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcInV0aWxcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgdHJpbSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL15cXHMrfFxccyskL2csIFwiXCIpO1xuICAgIH07XG4gICAgdmFyIHRyaW1Db252ZXJ0ID0gZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIHJldHVybiB1cmwucmVwbGFjZSgvXFwvY29udmVydFxcYi4qLywgXCJcIik7XG4gICAgfTtcbiAgICB2YXIgVVJMX1JFR0VYID0gL14oaHR0cHxodHRwcylcXDouKlxcL1xcLy9pO1xuICAgIHZhciBpc1VybCA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgICByZXR1cm4gISFzdHJpbmcubWF0Y2goVVJMX1JFR0VYKTtcbiAgICB9O1xuICAgIHZhciBwYXJzZVVybCA9IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICBpZiAoIXVybCB8fCB1cmwuY2hhckF0KDApID09PSBcIi9cIikge1xuICAgICAgICAgICAgdXJsID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3QgKyB1cmw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtcbiAgICAgICAgYS5ocmVmID0gdXJsO1xuICAgICAgICB2YXIgaG9zdCA9IGEuaG9zdG5hbWUuaW5kZXhPZihcIjpcIikgPT09IC0xID8gYS5ob3N0bmFtZSA6IGEuaG9zdDtcbiAgICAgICAgdmFyIHJldCA9IHtcbiAgICAgICAgICAgIHNvdXJjZTogdXJsLFxuICAgICAgICAgICAgcHJvdG9jb2w6IGEucHJvdG9jb2wucmVwbGFjZShcIjpcIiwgXCJcIiksXG4gICAgICAgICAgICBob3N0OiBob3N0LFxuICAgICAgICAgICAgcG9ydDogYS5wb3J0LFxuICAgICAgICAgICAgcXVlcnk6IGEuc2VhcmNoLFxuICAgICAgICAgICAgcGFyYW1zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0ge30sIHNlZyA9IGEuc2VhcmNoLnJlcGxhY2UoL15cXD8vLCBcIlwiKS5zcGxpdChcIiZcIiksIGxlbiA9IHNlZy5sZW5ndGgsIGkgPSAwLCBzO1xuICAgICAgICAgICAgICAgIGZvciAoO2kgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXNlZ1tpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcyA9IHNlZ1tpXS5zcGxpdChcIj1cIik7XG4gICAgICAgICAgICAgICAgICAgIHJldFtzWzBdXSA9IHNbMV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9KCksXG4gICAgICAgICAgICBmaWxlOiAoYS5wYXRobmFtZS5tYXRjaCgvXFwvKFteXFwvPyNdKykkL2kpIHx8IFsgdW5kZWZpbmVkLCBcIlwiIF0pWzFdLFxuICAgICAgICAgICAgaGFzaDogYS5oYXNoLnJlcGxhY2UoXCIjXCIsIFwiXCIpLFxuICAgICAgICAgICAgcGF0aDogYS5wYXRobmFtZS5yZXBsYWNlKC9eKFteXFwvXSkvLCBcIi8kMVwiKSxcbiAgICAgICAgICAgIHJlbGF0aXZlOiAoYS5ocmVmLm1hdGNoKC90cHM/OlxcL1xcL1teXFwvXSsoLispLykgfHwgWyB1bmRlZmluZWQsIFwiXCIgXSlbMV0sXG4gICAgICAgICAgICBzZWdtZW50czogYS5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywgXCJcIikuc3BsaXQoXCIvXCIpXG4gICAgICAgIH07XG4gICAgICAgIHJldC5vcmlnaW4gPSByZXQucHJvdG9jb2wgKyBcIjovL1wiICsgcmV0Lmhvc3QgKyAocmV0LnBvcnQgPyBcIjpcIiArIHJldC5wb3J0IDogXCJcIik7XG4gICAgICAgIHJldC5yYXdVcmwgPSAocmV0Lm9yaWdpbiArIHJldC5wYXRoKS5yZXBsYWNlKFwiL2NvbnZlcnRcIiwgXCJcIik7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICB2YXIgZW5kc1dpdGggPSBmdW5jdGlvbihzdHIsIHN1ZmZpeCkge1xuICAgICAgICByZXR1cm4gc3RyLmluZGV4T2Yoc3VmZml4LCBzdHIubGVuZ3RoIC0gc3VmZml4Lmxlbmd0aCkgIT09IC0xO1xuICAgIH07XG4gICAgdmFyIGFwcGVuZFF1ZXJ5VG9VcmwgPSBmdW5jdGlvbih1cmwsIGtleSwgdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHVybCArICh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCA/IFwiJlwiIDogXCI/XCIpICsga2V5ICsgXCI9XCIgKyB2YWx1ZTtcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIHRyaW06IHRyaW0sXG4gICAgICAgIHRyaW1Db252ZXJ0OiB0cmltQ29udmVydCxcbiAgICAgICAgcGFyc2VVcmw6IHBhcnNlVXJsLFxuICAgICAgICBpc1VybDogaXNVcmwsXG4gICAgICAgIGVuZHNXaXRoOiBlbmRzV2l0aCxcbiAgICAgICAgYXBwZW5kUXVlcnlUb1VybDogYXBwZW5kUXVlcnlUb1VybFxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwidXRpbFwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBpc0FycmF5ID0gZnVuY3Rpb24obykge1xuICAgICAgICByZXR1cm4gbyAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykgPT09IFwiW29iamVjdCBBcnJheV1cIjtcbiAgICB9O1xuICAgIHZhciBpc0ZpbGUgPSBmdW5jdGlvbihvKSB7XG4gICAgICAgIHJldHVybiBvICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PT0gXCJbb2JqZWN0IEZpbGVdXCI7XG4gICAgfTtcbiAgICB2YXIgaXNFbGVtZW50ID0gZnVuY3Rpb24obykge1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdy5IVE1MRWxlbWVudCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgcmV0dXJuIG8gaW5zdGFuY2VvZiB3aW5kb3cuSFRNTEVsZW1lbnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbyAmJiB0eXBlb2YgbyA9PT0gXCJvYmplY3RcIiAmJiBvLm5vZGVUeXBlID09PSAxICYmIHR5cGVvZiBvLm5vZGVOYW1lID09PSBcInN0cmluZ1wiO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgaXNGaWxlSW5wdXRFbGVtZW50ID0gZnVuY3Rpb24obykge1xuICAgICAgICByZXR1cm4gaXNFbGVtZW50KG8pICYmIG8udGFnTmFtZSA9PT0gXCJJTlBVVFwiICYmIG8udHlwZSA9PT0gXCJmaWxlXCI7XG4gICAgfTtcbiAgICB2YXIgdHlwZU9mID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJudWxsXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcImFycmF5XCI7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGaWxlKHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiZmlsZVwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0eXBlb2YgdmFsdWU7XG4gICAgfTtcbiAgICB2YXIgZ2V0SWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICAgICAgICByZXR1cm4gZC5nZXRUaW1lKCkudG9TdHJpbmcoKTtcbiAgICB9O1xuICAgIHZhciBzZXREZWZhdWx0ID0gZnVuY3Rpb24ob2JqLCBrZXksIGRlZikge1xuICAgICAgICBpZiAob2JqW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgb2JqW2tleV0gPSBkZWY7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBhZGRPbkxvYWQgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgIGlmICh3aW5kb3cualF1ZXJ5KSB7XG4gICAgICAgICAgICB3aW5kb3cualF1ZXJ5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGZ1bmMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGV2bnQgPSBcImxvYWRcIjtcbiAgICAgICAgICAgIGlmICh3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKGV2bnQsIGZ1bmMsIGZhbHNlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmF0dGFjaEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmF0dGFjaEV2ZW50KFwib25cIiArIGV2bnQsIGZ1bmMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAod2luZG93Lm9ubG9hZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY3VyciA9IHdpbmRvdy5vbmxvYWQ7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmMoKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cub25sb2FkID0gZnVuYztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBpc0ZQVXJsID0gZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiICYmIHVybC5tYXRjaChmcC51cmxzLkJBU0UgKyBcIi9hcGkvZmlsZS9cIik7XG4gICAgfTtcbiAgICB2YXIgaXNGUFVybENkbiA9IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiAmJiB1cmwubWF0Y2goXCIvYXBpL2ZpbGUvXCIpO1xuICAgIH07XG4gICAgdmFyIGdldEZQVXJsID0gZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IHVybC5tYXRjaCgvKD86Y2RuLmZpbGVzdGFja2NvbnRlbnQuY29tfGNkbi5maWxlcGlja2VyLmlvKVtcXFNdKlxcLyhbXFxTXXsyMCx9KS8pO1xuICAgICAgICAgICAgaWYgKG1hdGNoZWQgJiYgbWF0Y2hlZC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZwLnVybHMuQkFTRSArIFwiL2FwaS9maWxlL1wiICsgbWF0Y2hlZFsxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH07XG4gICAgdmFyIGNvbnNvbGVXcmFwID0gZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHdpbmRvdy5jb25zb2xlICYmIHR5cGVvZiB3aW5kb3cuY29uc29sZVtmbl0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlW2ZuXS5hcHBseSh3aW5kb3cuY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5hbGVydChBcnJheS5wcm90b3R5cGUuam9pbi5jYWxsKGFyZ3VtZW50cywgXCIsXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgY29uc29sZSA9IHt9O1xuICAgIGNvbnNvbGUubG9nID0gY29uc29sZVdyYXAoXCJsb2dcIik7XG4gICAgY29uc29sZS5lcnJvciA9IGNvbnNvbGVXcmFwKFwiZXJyb3JcIik7XG4gICAgdmFyIGNsb25lID0gZnVuY3Rpb24obykge1xuICAgICAgICB2YXIgcmV0ID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvKSB7XG4gICAgICAgICAgICByZXRba2V5XSA9IG9ba2V5XTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgdmFyIHN0YW5kYXJkaXplRlBGaWxlID0gZnVuY3Rpb24oanNvbikge1xuICAgICAgICB2YXIgZnBmaWxlID0ge307XG4gICAgICAgIGZwZmlsZS51cmwgPSBqc29uLnVybDtcbiAgICAgICAgZnBmaWxlLmZpbGVuYW1lID0ganNvbi5maWxlbmFtZSB8fCBqc29uLm5hbWU7XG4gICAgICAgIGZwZmlsZS5taW1ldHlwZSA9IGpzb24ubWltZXR5cGUgfHwganNvbi50eXBlO1xuICAgICAgICBmcGZpbGUuc2l6ZSA9IGpzb24uc2l6ZTtcbiAgICAgICAgZnBmaWxlLmtleSA9IGpzb24ua2V5IHx8IGpzb24uczNfa2V5O1xuICAgICAgICBmcGZpbGUuaXNXcml0ZWFibGUgPSAhIShqc29uLmlzV3JpdGVhYmxlIHx8IGpzb24ud3JpdGVhYmxlKTtcbiAgICAgICAgcmV0dXJuIGZwZmlsZTtcbiAgICB9O1xuICAgIHZhciBpc0NhbnZhc1N1cHBvcnRlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuICAgICAgICAgICAgcmV0dXJuICEhKGVsZW0uZ2V0Q29udGV4dCAmJiBlbGVtLmdldENvbnRleHQoXCIyZFwiKSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgZXh0ZW5kID0gZnVuY3Rpb24ob2JqMSwgb2JqMikge1xuICAgICAgICBmb3IgKHZhciBpIGluIG9iajEpIHtcbiAgICAgICAgICAgIGlmIChvYmoxLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICAgICAgb2JqMltpXSA9IG9iajFbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajI7XG4gICAgfTtcbiAgICB2YXIgY2hlY2tBcGlLZXkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCFmcC5hcGlrZXkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiQVBJIEtleSBub3QgZm91bmRcIik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBvYmplY3RLZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmtleXMgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgICAgICAgICAgIHZhciBrZXlzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmopO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBpc0FycmF5OiBpc0FycmF5LFxuICAgICAgICBpc0ZpbGU6IGlzRmlsZSxcbiAgICAgICAgaXNFbGVtZW50OiBpc0VsZW1lbnQsXG4gICAgICAgIGlzRmlsZUlucHV0RWxlbWVudDogaXNGaWxlSW5wdXRFbGVtZW50LFxuICAgICAgICBnZXRJZDogZ2V0SWQsXG4gICAgICAgIHNldERlZmF1bHQ6IHNldERlZmF1bHQsXG4gICAgICAgIHR5cGVPZjogdHlwZU9mLFxuICAgICAgICBhZGRPbkxvYWQ6IGFkZE9uTG9hZCxcbiAgICAgICAgaXNGUFVybDogaXNGUFVybCxcbiAgICAgICAgZ2V0RlBVcmw6IGdldEZQVXJsLFxuICAgICAgICBpc0ZQVXJsQ2RuOiBpc0ZQVXJsQ2RuLFxuICAgICAgICBjb25zb2xlOiBjb25zb2xlLFxuICAgICAgICBjbG9uZTogY2xvbmUsXG4gICAgICAgIHN0YW5kYXJkaXplRlBGaWxlOiBzdGFuZGFyZGl6ZUZQRmlsZSxcbiAgICAgICAgaXNDYW52YXNTdXBwb3J0ZWQ6IGlzQ2FudmFzU3VwcG9ydGVkLFxuICAgICAgICBleHRlbmQ6IGV4dGVuZCxcbiAgICAgICAgY2hlY2tBcGlLZXk6IGNoZWNrQXBpS2V5LFxuICAgICAgICBvYmplY3RLZXlzOiBvYmplY3RLZXlzXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJ3aW5kb3dVdGlsc1wiLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRXaWR0aDogZ2V0V2lkdGgsXG4gICAgICAgIGdldEhlaWdodDogZ2V0SGVpZ2h0XG4gICAgfTtcbiAgICBmdW5jdGlvbiBnZXRXaWR0aCgpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCB8fCBkb2N1bWVudC5ib2R5ICYmIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGggfHwgMTAyNDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0SGVpZ2h0KCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCB8fCBkb2N1bWVudC5ib2R5ICYmIGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0IHx8IDc2ODtcbiAgICB9XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwiZHJhZ2Ryb3BcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgY2FuRHJhZ0Ryb3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICghIXdpbmRvdy5GaWxlUmVhZGVyIHx8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIlNhZmFyaVwiKSA+PSAwKSAmJiBcImRyYWdnYWJsZVwiIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgIH07XG4gICAgdmFyIG1ha2VEcm9wUGFuZSA9IGZ1bmN0aW9uKGRpdiwgb3B0aW9ucykge1xuICAgICAgICB2YXIgZXJyID0gXCJObyBET00gZWxlbWVudCBmb3VuZCB0byBjcmVhdGUgZHJvcCBwYW5lXCI7XG4gICAgICAgIGlmICghZGl2KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXYuanF1ZXJ5KSB7XG4gICAgICAgICAgICBpZiAoZGl2Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXYgPSBkaXZbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjYW5EcmFnRHJvcCgpKSB7XG4gICAgICAgICAgICBmcC51dGlsLmNvbnNvbGUuZXJyb3IoXCJZb3VyIGJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IGRyYWctZHJvcCBmdW5jdGlvbmFsaXR5XCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB2YXIgZHJhZ0VudGVyID0gb3B0aW9ucy5kcmFnRW50ZXIgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgdmFyIGRyYWdMZWF2ZSA9IG9wdGlvbnMuZHJhZ0xlYXZlIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBvblN0YXJ0ID0gb3B0aW9ucy5vblN0YXJ0IHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBvblN1Y2Nlc3MgPSBvcHRpb25zLm9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgb25FcnJvciA9IG9wdGlvbnMub25FcnJvciB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgb25Qcm9ncmVzcyA9IG9wdGlvbnMub25Qcm9ncmVzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgbWltZXR5cGVzID0gb3B0aW9ucy5taW1ldHlwZXM7XG4gICAgICAgIGlmICghbWltZXR5cGVzKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5taW1ldHlwZSkge1xuICAgICAgICAgICAgICAgIG1pbWV0eXBlcyA9IFsgb3B0aW9ucy5taW1ldHlwZSBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtaW1ldHlwZXMgPSBbIFwiKi8qXCIgXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZnAudXRpbC50eXBlT2YobWltZXR5cGVzKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbWltZXR5cGVzID0gbWltZXR5cGVzLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXh0ZW5zaW9ucyA9IG9wdGlvbnMuZXh0ZW5zaW9ucztcbiAgICAgICAgaWYgKCFleHRlbnNpb25zKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5leHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zID0gWyBvcHRpb25zLmV4dGVuc2lvbiBdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmcC51dGlsLnR5cGVPZihleHRlbnNpb25zKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgZXh0ZW5zaW9ucyA9IGV4dGVuc2lvbnMucmVwbGFjZSgvIC9nLCBcIlwiKS5zcGxpdChcIixcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV4dGVuc2lvbnMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXh0ZW5zaW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNbaV0gPSBleHRlbnNpb25zW2ldLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN0b3JlX29wdGlvbnMgPSB7XG4gICAgICAgICAgICBsb2NhdGlvbjogb3B0aW9ucy5sb2NhdGlvbixcbiAgICAgICAgICAgIHBhdGg6IG9wdGlvbnMucGF0aCxcbiAgICAgICAgICAgIGNvbnRhaW5lcjogb3B0aW9ucy5jb250YWluZXIsXG4gICAgICAgICAgICBhY2Nlc3M6IG9wdGlvbnMuYWNjZXNzLFxuICAgICAgICAgICAgcG9saWN5OiBvcHRpb25zLnBvbGljeSxcbiAgICAgICAgICAgIHNpZ25hdHVyZTogb3B0aW9ucy5zaWduYXR1cmVcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGVuYWJsZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBkaXYgJiYgKGRpdi5nZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiKSB8fCBcImVuYWJsZWRcIikgIT09IFwiZGlzYWJsZWRcIjtcbiAgICAgICAgfTtcbiAgICAgICAgZGl2LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnZW50ZXJcIiwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKGVuYWJsZWQoKSkge1xuICAgICAgICAgICAgICAgIGRyYWdFbnRlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICBkaXYuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdsZWF2ZVwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpZiAoZW5hYmxlZCgpKSB7XG4gICAgICAgICAgICAgICAgZHJhZ0xlYXZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIGRpdi5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ292ZXJcIiwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9IFwiY29weVwiO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIGRpdi5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKCFlbmFibGVkKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNGb2xkZXJEcm9wcGVkKGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZpbGVzID0gZS5kYXRhVHJhbnNmZXIuZmlsZXMsIGltYWdlU3JjID0gZ2V0SW1hZ2VTcmNEcm9wKGUuZGF0YVRyYW5zZmVyKTtcbiAgICAgICAgICAgIGlmIChmaWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB1cGxvYWREcm9wcGVkRmlsZXMoZmlsZXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpbWFnZVNyYykge1xuICAgICAgICAgICAgICAgIHVwbG9hZEltYWdlU3JjKGltYWdlU3JjKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihcIk5vRmlsZXNGb3VuZFwiLCBcIk5vIGZpbGVzIHVwbG9hZGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHJlZW5hYmxlUGFuZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZGl2LnNldEF0dHJpYnV0ZShcImRpc2FibGVkXCIsIFwiZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIGlmICh3aW5kb3cuJCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy4kKGRpdikucHJvcChcImRpc2FibGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHByb2dyZXNzZXMgPSB7fTtcbiAgICAgICAgdmFyIHJlc3BvbnNlID0gW107XG4gICAgICAgIHZhciBnZXRTdWNjZXNzSGFuZGxlciA9IGZ1bmN0aW9uKGksIHRvdGFsKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oZnBmaWxlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zLm11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhbIGZwZmlsZSBdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5wdXNoKGZwZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5sZW5ndGggPT09IHRvdGFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzZXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzZXNbaV0gPSAxMDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQcm9ncmVzcyh0b3RhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVlbmFibGVQYW5lKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgICB2YXIgZXJyb3JIYW5kbGVyID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICBvbkVycm9yKFwiVXBsb2FkRXJyb3JcIiwgZXJyLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgcmVlbmFibGVQYW5lKCk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBnZXRQcm9ncmVzc0hhbmRsZXIgPSBmdW5jdGlvbihpLCB0b3RhbCkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHBlcmNlbnQpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmVzc2VzW2ldID0gcGVyY2VudDtcbiAgICAgICAgICAgICAgICB1cGRhdGVQcm9ncmVzcyh0b3RhbCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgICB2YXIgdXBkYXRlUHJvZ3Jlc3MgPSBmdW5jdGlvbih0b3RhbENvdW50KSB7XG4gICAgICAgICAgICB2YXIgdG90YWxQcm9ncmVzcyA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHByb2dyZXNzZXMpIHtcbiAgICAgICAgICAgICAgICB0b3RhbFByb2dyZXNzICs9IHByb2dyZXNzZXNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcGVyY2VudGFnZSA9IHRvdGFsUHJvZ3Jlc3MgLyB0b3RhbENvdW50O1xuICAgICAgICAgICAgb25Qcm9ncmVzcyhwZXJjZW50YWdlKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHZlcmlmeVVwbG9hZCA9IGZ1bmN0aW9uKGZpbGVzKSB7XG4gICAgICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAxICYmICFvcHRpb25zLm11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IoXCJUb29NYW55RmlsZXNcIiwgXCJPbmx5IG9uZSBmaWxlIGF0IGEgdGltZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5tYXhGaWxlcyA+IDAgJiYgZmlsZXMubGVuZ3RoID4gb3B0aW9ucy5tYXhGaWxlcykge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKFwiVG9vTWFueUZpbGVzXCIsIFwiT25seSBcIiArIG9wdGlvbnMubWF4RmlsZXMgKyBcIiBmaWxlcyBhdCBhIHRpbWVcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGZvdW5kO1xuICAgICAgICAgICAgICAgIHZhciBmaWxlO1xuICAgICAgICAgICAgICAgIHZhciBmaWxlbmFtZTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZpbGUgPSBmaWxlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWUgPSBmaWxlLm5hbWUgfHwgZmlsZS5maWxlTmFtZSB8fCBcIlVua25vd24gZmlsZVwiO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1pbWV0eXBlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1pbWV0eXBlID0gZnAubWltZXR5cGVzLmdldE1pbWV0eXBlKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgPSBmb3VuZCB8fCBmcC5taW1ldHlwZXMubWF0Y2hlc01pbWV0eXBlKG1pbWV0eXBlLCBtaW1ldHlwZXNbal0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uRXJyb3IoXCJXcm9uZ1R5cGVcIiwgZmlsZW5hbWUgKyBcIiBpc24ndCB0aGUgcmlnaHQgdHlwZSBvZiBmaWxlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGV4dGVuc2lvbnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IGZvdW5kIHx8IGZwLnV0aWwuZW5kc1dpdGgoZmlsZW5hbWUsIGV4dGVuc2lvbnNbal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRXJyb3IoXCJXcm9uZ1R5cGVcIiwgZmlsZW5hbWUgKyBcIiBpc24ndCB0aGUgcmlnaHQgdHlwZSBvZiBmaWxlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZS5zaXplICYmICEhb3B0aW9ucy5tYXhTaXplICYmIGZpbGUuc2l6ZSA+IG9wdGlvbnMubWF4U2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb25FcnJvcihcIldyb25nU2l6ZVwiLCBmaWxlbmFtZSArIFwiIGlzIHRvbyBsYXJnZSAoXCIgKyBmaWxlLnNpemUgKyBcIiBCeXRlcylcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9uRXJyb3IoXCJOb0ZpbGVzRm91bmRcIiwgXCJObyBmaWxlcyB1cGxvYWRlZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGdldEltYWdlU3JjRHJvcCA9IGZ1bmN0aW9uKGRhdGFUcmFuc2Zlcikge1xuICAgICAgICAgICAgdmFyIHVybCwgbWF0Y2hlZDtcbiAgICAgICAgICAgIGlmIChkYXRhVHJhbnNmZXIgJiYgdHlwZW9mIGRhdGFUcmFuc2Zlci5nZXREYXRhID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICB1cmwgPSBkYXRhVHJhbnNmZXIuZ2V0RGF0YShcInRleHRcIik7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdXJsID0gdXJsIHx8IGRhdGFUcmFuc2Zlci5nZXREYXRhKFwidGV4dC9odG1sXCIpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZnAudXRpbC5jb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodXJsICYmICFmcC51dGlsLmlzVXJsKHVybCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCA9IHVybC5tYXRjaCgvPGltZy4qP3NyYz1cIiguKj8pXCIvaSk7XG4gICAgICAgICAgICAgICAgICAgIHVybCA9IG1hdGNoZWQgJiYgbWF0Y2hlZC5sZW5ndGggPiAxID8gbWF0Y2hlZFsxXSA6IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVybDtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc1NyY1VwbG9hZChibG9iKSB7XG4gICAgICAgICAgICB2YXIgc3VjY2Vzc0hhbmRsZXJGb3JPbmVGaWxlID0gZ2V0U3VjY2Vzc0hhbmRsZXIoMCwgMSk7XG4gICAgICAgICAgICB2YXIgYmxvYlRvQ2hlY2sgPSBmcC51dGlsLmNsb25lKGJsb2IpO1xuICAgICAgICAgICAgYmxvYlRvQ2hlY2submFtZSA9IGJsb2JUb0NoZWNrLmZpbGVuYW1lO1xuICAgICAgICAgICAgaWYgKHZlcmlmeVVwbG9hZChbIGJsb2JUb0NoZWNrIF0pKSB7XG4gICAgICAgICAgICAgICAgc3VjY2Vzc0hhbmRsZXJGb3JPbmVGaWxlKGJsb2IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmcC5maWxlcy5yZW1vdmUoYmxvYi51cmwsIHN0b3JlX29wdGlvbnMsIGZ1bmN0aW9uKCkge30sIGZ1bmN0aW9uKCkge30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHVwbG9hZERyb3BwZWRGaWxlcyhmaWxlcykge1xuICAgICAgICAgICAgdmFyIHRvdGFsID0gZmlsZXMubGVuZ3RoLCBpO1xuICAgICAgICAgICAgaWYgKHZlcmlmeVVwbG9hZChmaWxlcykpIHtcbiAgICAgICAgICAgICAgICBvblN0YXJ0KGZpbGVzKTtcbiAgICAgICAgICAgICAgICBkaXYuc2V0QXR0cmlidXRlKFwiZGlzYWJsZWRcIiwgXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZmlsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZnAuc3RvcmUoZmlsZXNbaV0sIHN0b3JlX29wdGlvbnMsIGdldFN1Y2Nlc3NIYW5kbGVyKGksIHRvdGFsKSwgZXJyb3JIYW5kbGVyLCBnZXRQcm9ncmVzc0hhbmRsZXIoaSwgdG90YWwpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gdXBsb2FkSW1hZ2VTcmMoaW1hZ2VTcmMpIHtcbiAgICAgICAgICAgIHZhciBwcm9ncmVzc0hhbmRsZXJGb3JPbmVGaWxlID0gZ2V0UHJvZ3Jlc3NIYW5kbGVyKDAsIDEpO1xuICAgICAgICAgICAgZnAuc3RvcmVVcmwoaW1hZ2VTcmMsIG9uU3VjY2Vzc1NyY1VwbG9hZCwgZXJyb3JIYW5kbGVyLCBwcm9ncmVzc0hhbmRsZXJGb3JPbmVGaWxlKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBpc0ZvbGRlckRyb3BwZWQoZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBlbnRyeSwgaXRlbXMsIGk7XG4gICAgICAgICAgICBpZiAoZXZlbnQuZGF0YVRyYW5zZmVyLml0ZW1zKSB7XG4gICAgICAgICAgICAgICAgaXRlbXMgPSBldmVudC5kYXRhVHJhbnNmZXIuaXRlbXM7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5ID0gaXRlbXNbaV0gJiYgaXRlbXNbaV0ud2Via2l0R2V0QXNFbnRyeSA/IGl0ZW1zW2ldLndlYmtpdEdldEFzRW50cnkoKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVudHJ5ICYmICEhZW50cnkuaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uRXJyb3IoXCJXcm9uZ1R5cGVcIiwgXCJVcGxvYWRpbmcgYSBmb2xkZXIgaXMgbm90IGFsbG93ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZW5hYmxlZDogY2FuRHJhZ0Ryb3AsXG4gICAgICAgIG1ha2VEcm9wUGFuZTogbWFrZURyb3BQYW5lXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJyZXNwb25zaXZlSW1hZ2VzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIFdJTkRPV19SRVNJWkVfVElNRU9VVCA9IDIwMDtcbiAgICB2YXIgcmVsb2FkV2l0aERlYm91bmNlID0gZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0cnVjdEFsbCgpO1xuICAgIH0sIFdJTkRPV19SRVNJWkVfVElNRU9VVCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgYWN0aXZhdGU6IGFjdGl2YXRlLFxuICAgICAgICBkZWFjdGl2YXRlOiBkZWFjdGl2YXRlLFxuICAgICAgICB1cGRhdGU6IHVwZGF0ZSxcbiAgICAgICAgc2V0UmVzcG9uc2l2ZU9wdGlvbnM6IHNldFJlc3BvbnNpdmVPcHRpb25zLFxuICAgICAgICBnZXRSZXNwb25zaXZlT3B0aW9uczogZ2V0UmVzcG9uc2l2ZU9wdGlvbnMsXG4gICAgICAgIGdldEVsZW1lbnREaW1zOiBnZXRFbGVtZW50RGltcyxcbiAgICAgICAgcmVwbGFjZVNyYzogcmVwbGFjZVNyYyxcbiAgICAgICAgZ2V0Q3VycmVudFJlc2l6ZVBhcmFtczogZ2V0Q3VycmVudFJlc2l6ZVBhcmFtcyxcbiAgICAgICAgY29uc3RydWN0OiBjb25zdHJ1Y3QsXG4gICAgICAgIGNvbnN0cnVjdFBhcmFtczogY29uc3RydWN0UGFyYW1zLFxuICAgICAgICBzaG91bGRDb25zdHJ1Y3Q6IHNob3VsZENvbnN0cnVjdCxcbiAgICAgICAgcm91bmRXaXRoU3RlcDogcm91bmRXaXRoU3RlcCxcbiAgICAgICAgYWRkV2luZG93UmVzaXplRXZlbnQ6IGFkZFdpbmRvd1Jlc2l6ZUV2ZW50LFxuICAgICAgICByZW1vdmVXaW5kb3dSZXNpemVFdmVudDogcmVtb3ZlV2luZG93UmVzaXplRXZlbnRcbiAgICB9O1xuICAgIGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICAgICAgICBjb25zdHJ1Y3RBbGwoKTtcbiAgICAgICAgYWRkV2luZG93UmVzaXplRXZlbnQocmVsb2FkV2l0aERlYm91bmNlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgICAgICAgcmVtb3ZlV2luZG93UmVzaXplRXZlbnQocmVsb2FkV2l0aERlYm91bmNlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdXBkYXRlKGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKGVsZW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQubm9kZU5hbWUgPT09IFwiSU1HXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdHJ1Y3QoZWxlbWVudCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiUGFzc2VkIG9iamVjdCBpcyBub3QgYW4gaW1hZ2VcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RBbGwodHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gY29uc3RydWN0QWxsKGZvcmNlQ29uc3RydWN0KSB7XG4gICAgICAgIHZhciByZXNwb25zaXZlSW1hZ2VzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImltZ1tkYXRhLWZwLXNyY11cIiksIGVsZW1lbnQsIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCByZXNwb25zaXZlSW1hZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBlbGVtZW50ID0gcmVzcG9uc2l2ZUltYWdlc1tpXTtcbiAgICAgICAgICAgIGlmIChzaG91bGRDb25zdHJ1Y3QoZWxlbWVudCkgfHwgZm9yY2VDb25zdHJ1Y3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdHJ1Y3QoZWxlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gc2hvdWxkQ29uc3RydWN0KGltYWdlKSB7XG4gICAgICAgIHZhciBpbWFnZVNyYyA9IGdldFNyY0F0dHIoaW1hZ2UpLCBjaGFuZ2VPblJlc2l6ZSA9IGdldEZwT25SZXNpemVBdHRyKGltYWdlKSB8fCBnZXRSZXNwb25zaXZlT3B0aW9ucygpLm9uUmVzaXplIHx8IFwiYWxsXCI7XG4gICAgICAgIGlmICghaW1hZ2VTcmMgfHwgY2hhbmdlT25SZXNpemUgPT09IFwiYWxsXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGFuZ2VPblJlc2l6ZSA9PT0gXCJub25lXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2hvdWxkQmVFbmxhcmdlZCA9IGdldEN1cnJlbnRSZXNpemVQYXJhbXMoaW1hZ2VTcmMpLndpZHRoIDwgZ2V0RWxlbWVudERpbXMoaW1hZ2UpLndpZHRoO1xuICAgICAgICBpZiAoc2hvdWxkQmVFbmxhcmdlZCAmJiBjaGFuZ2VPblJlc2l6ZSA9PT0gXCJ1cFwiIHx8ICFzaG91bGRCZUVubGFyZ2VkICYmIGNoYW5nZU9uUmVzaXplID09PSBcImRvd25cIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRFbGVtZW50RGltcyhlbGVtKSB7XG4gICAgICAgIHZhciBkaW1zID0ge307XG4gICAgICAgIGlmIChlbGVtLnBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGRpbXMud2lkdGggPSBmcC53aW5kb3dVdGlscy5nZXRXaWR0aCgpO1xuICAgICAgICAgICAgZGltcy5oZWlnaHQgPSBmcC53aW5kb3dVdGlscy5nZXRXaWR0aCgpO1xuICAgICAgICAgICAgcmV0dXJuIGRpbXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW0uYWx0ICYmICFlbGVtLmZwQWx0Q2hlY2spIHtcbiAgICAgICAgICAgIGVsZW0ucGFyZW50Tm9kZS5mcEFsdENoZWNrID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBnZXRFbGVtZW50RGltcyhlbGVtLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGRpbXMud2lkdGggPSBlbGVtLm9mZnNldFdpZHRoO1xuICAgICAgICBkaW1zLmhlaWdodCA9IGVsZW0ub2Zmc2V0SGVpZ2h0O1xuICAgICAgICBpZiAoIWRpbXMud2lkdGgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRFbGVtZW50RGltcyhlbGVtLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaW1zO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZXBsYWNlU3JjKGVsZW0sIG5ld1NyYykge1xuICAgICAgICB2YXIgcHJldmlvdXNTcmMgPSBnZXRTcmNBdHRyKGVsZW0pIHx8IGdldEZwU3JjQXR0cihlbGVtKTtcbiAgICAgICAgaWYgKHByZXZpb3VzU3JjICE9PSBuZXdTcmMpIHtcbiAgICAgICAgICAgIGVsZW0uc3JjID0gbmV3U3JjO1xuICAgICAgICAgICAgaWYgKHByZXZpb3VzU3JjKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uc3JjID0gcHJldmlvdXNTcmM7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0ub25lcnJvciA9IG51bGw7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRGcE9uUmVzaXplQXR0cihlbGVtKSB7XG4gICAgICAgIHJldHVybiBlbGVtLmdldEF0dHJpYnV0ZShcImRhdGEtZnAtb24tcmVzaXplXCIpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRGcFBpeGVsUm91bmRBdHRyKGVsZW0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1waXhlbC1yb3VuZFwiKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0U3JjQXR0cihlbGVtKSB7XG4gICAgICAgIHJldHVybiBlbGVtLmdldEF0dHJpYnV0ZShcInNyY1wiKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0RnBTcmNBdHRyKGVsZW0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1zcmNcIik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldEZwS2V5QXR0cihlbGVtKSB7XG4gICAgICAgIHJldHVybiBlbGVtLmdldEF0dHJpYnV0ZShcImRhdGEtZnAtYXBpa2V5XCIpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRGcFNpZ25hdHVyZUF0dHIoZWxlbSkge1xuICAgICAgICByZXR1cm4gZWxlbS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLXNpZ25hdHVyZVwiKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0RnBQb2xpY3lBdHRyKGVsZW0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1wb2xpY3lcIik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldEN1cnJlbnRSZXNpemVQYXJhbXModXJsKSB7XG4gICAgICAgIHJldHVybiBmcC5jb252ZXJzaW9uc1V0aWwucGFyc2VVcmwodXJsKS5vcHRpb25zRGljdC5yZXNpemUgfHwge307XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNvbnN0cnVjdChlbGVtKSB7XG4gICAgICAgIHZhciB1cmwgPSBnZXRGcFNyY0F0dHIoZWxlbSkgfHwgZ2V0U3JjQXR0cihlbGVtKSwgYXBpa2V5ID0gZ2V0RnBLZXlBdHRyKGVsZW0pIHx8IGZwLmFwaWtleSwgcmVzcG9uc2l2ZU9wdGlvbnMgPSBnZXRSZXNwb25zaXZlT3B0aW9ucygpO1xuICAgICAgICBpZiAoIWZwLmFwaWtleSkge1xuICAgICAgICAgICAgZnAuc2V0S2V5KGFwaWtleSk7XG4gICAgICAgICAgICBmcC51dGlsLmNoZWNrQXBpS2V5KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVwbGFjZVNyYyhlbGVtLCBmcC5jb252ZXJzaW9uc1V0aWwuYnVpbGRVcmwodXJsLCBjb25zdHJ1Y3RQYXJhbXMoZWxlbSwgcmVzcG9uc2l2ZU9wdGlvbnMpLCBhcGlrZXkpKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gY29uc3RydWN0UGFyYW1zKGVsZW0sIHJlc3BvbnNpdmVPcHRpb25zKSB7XG4gICAgICAgIHJlc3BvbnNpdmVPcHRpb25zID0gcmVzcG9uc2l2ZU9wdGlvbnMgfHwge307XG4gICAgICAgIHZhciBkaW1zID0gZ2V0RWxlbWVudERpbXMoZWxlbSksIHBpeGVsUm91bmQgPSBnZXRGcFBpeGVsUm91bmRBdHRyKGVsZW0pIHx8IHJlc3BvbnNpdmVPcHRpb25zLnBpeGVsUm91bmQgfHwgMTAsIHBhcmFtcyA9IHtcbiAgICAgICAgICAgIHJlc2l6ZToge1xuICAgICAgICAgICAgICAgIHdpZHRoOiByb3VuZFdpdGhTdGVwKGRpbXMud2lkdGgsIHBpeGVsUm91bmQpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHNpZ25hdHVyZSA9IHJlc3BvbnNpdmVPcHRpb25zLnNpZ25hdHVyZSB8fCBnZXRGcFNpZ25hdHVyZUF0dHIoZWxlbSk7XG4gICAgICAgIGlmIChzaWduYXR1cmUpIHtcbiAgICAgICAgICAgIHBhcmFtcy5zZWN1cml0eSA9IHtcbiAgICAgICAgICAgICAgICBzaWduYXR1cmU6IHNpZ25hdHVyZSxcbiAgICAgICAgICAgICAgICBwb2xpY3k6IHJlc3BvbnNpdmVPcHRpb25zLnBvbGljeSB8fCBnZXRGcFBvbGljeUF0dHIoZWxlbSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICB9XG4gICAgZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCkge1xuICAgICAgICB2YXIgdGltZW91dDtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYWRkV2luZG93UmVzaXplRXZlbnQob25XaW5kb3dSZXNpemVkKSB7XG4gICAgICAgIGlmICh3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgb25XaW5kb3dSZXNpemVkLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSBpZiAod2luZG93LmF0dGFjaEV2ZW50KSB7XG4gICAgICAgICAgICB3aW5kb3cuYXR0YWNoRXZlbnQoXCJvbnJlc2l6ZVwiLCBvbldpbmRvd1Jlc2l6ZWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbW92ZVdpbmRvd1Jlc2l6ZUV2ZW50KG9uV2luZG93UmVzaXplZCkge1xuICAgICAgICBpZiAod2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIG9uV2luZG93UmVzaXplZCwgZmFsc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5kZXRhY2hFdmVudCkge1xuICAgICAgICAgICAgd2luZG93LmRldGFjaEV2ZW50KFwib25yZXNpemVcIiwgb25XaW5kb3dSZXNpemVkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRSZXNwb25zaXZlT3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIGZwLnJlc3BvbnNpdmVPcHRpb25zIHx8IHt9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRSZXNwb25zaXZlT3B0aW9ucyhvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiUmVzcG9uc2l2ZSBvcHRpb25zIG11c3QgYmUgYW4gb2JqZWN0LlwiKTtcbiAgICAgICAgfVxuICAgICAgICBmcC5yZXNwb25zaXZlT3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJvdW5kV2l0aFN0ZXAodmFsdWUsIHJvdW5kKSB7XG4gICAgICAgIHZhciBwaXhlbFJvdW5kaW5nID0gcm91bmQgPT09IDAgPyAxIDogcm91bmQ7XG4gICAgICAgIHJldHVybiBNYXRoLmNlaWwodmFsdWUgLyBwaXhlbFJvdW5kaW5nKSAqIHBpeGVsUm91bmRpbmc7XG4gICAgfVxufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcIndpZGdldHNcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgc2V0QXR0cklmRXhpc3RzID0gZnVuY3Rpb24oa2V5LCBvcHRpb25zLCBhdHRybmFtZSwgZG9tKSB7XG4gICAgICAgIHZhciB2YWwgPSBkb20uZ2V0QXR0cmlidXRlKGF0dHJuYW1lKTtcbiAgICAgICAgaWYgKHZhbCkge1xuICAgICAgICAgICAgb3B0aW9uc1trZXldID0gdmFsO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgZmlyZU9uQ2hhbmdlRXZlbnQgPSBmdW5jdGlvbihpbnB1dCwgZnBmaWxlcykge1xuICAgICAgICB2YXIgZTtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZUV2ZW50KSB7XG4gICAgICAgICAgICBlID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJFdmVudFwiKTtcbiAgICAgICAgICAgIGUuaW5pdEV2ZW50KFwiY2hhbmdlXCIsIHRydWUsIGZhbHNlKTtcbiAgICAgICAgICAgIGUuZnBmaWxlID0gZnBmaWxlcyA/IGZwZmlsZXNbMF0gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBlLmZwZmlsZXMgPSBmcGZpbGVzO1xuICAgICAgICAgICAgaW5wdXQuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgfSBlbHNlIGlmIChkb2N1bWVudC5jcmVhdGVFdmVudE9iamVjdCkge1xuICAgICAgICAgICAgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KFwiRXZlbnRcIik7XG4gICAgICAgICAgICBlLmV2ZW50UGhhc2UgPSAyO1xuICAgICAgICAgICAgZS5jdXJyZW50VGFyZ2V0ID0gZS5zcmNFbGVtZW50ID0gZS50YXJnZXQgPSBpbnB1dDtcbiAgICAgICAgICAgIGUuZnBmaWxlID0gZnBmaWxlcyA/IGZwZmlsZXNbMF0gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBlLmZwZmlsZXMgPSBmcGZpbGVzO1xuICAgICAgICAgICAgaW5wdXQuZmlyZUV2ZW50KFwib25jaGFuZ2VcIiwgZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXQub25jaGFuZ2UpIHtcbiAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlKGZwZmlsZXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgc3BsaXRJZkV4aXN0ID0gZnVuY3Rpb24oa2V5LCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zW2tleV0pIHtcbiAgICAgICAgICAgIG9wdGlvbnNba2V5XSA9IG9wdGlvbnNba2V5XS5zcGxpdChcIixcIik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBzZXRBdHRySWZFeGlzdHNBcnJheSA9IGZ1bmN0aW9uKGZwb3B0aW9ucywgZG9tRWxlbWVudCwgb3B0aW9uc09iaikge1xuICAgICAgICBmb3IgKHZhciBvcHRpb24gaW4gb3B0aW9uc09iaikge1xuICAgICAgICAgICAgc2V0QXR0cklmRXhpc3RzKG9wdGlvbnNPYmpbb3B0aW9uXSwgZnBvcHRpb25zLCBvcHRpb24sIGRvbUVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0T3B0aW9ucyA9IGZ1bmN0aW9uKGRvbUVsZW1lbnQsIG1vZGUpIHtcbiAgICAgICAgbW9kZSA9IG1vZGUgfHwgXCJwaWNrXCI7XG4gICAgICAgIHZhciBmcG9wdGlvbnMgPSB7fSwgZ2VuZXJhbE9wdGlvbnNNYXAgPSB7XG4gICAgICAgICAgICBcImRhdGEtZnAtY29udGFpbmVyXCI6IFwiY29udGFpbmVyXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtbWltZXR5cGVcIjogXCJtaW1ldHlwZVwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWV4dGVuc2lvblwiOiBcImV4dGVuc2lvblwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLW9wZW5Ub1wiOiBcIm9wZW5Ub1wiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWRlYnVnXCI6IFwiZGVidWdcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1zaWduYXR1cmVcIjogXCJzaWduYXR1cmVcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1wb2xpY3lcIjogXCJwb2xpY3lcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1sYW5ndWFnZVwiOiBcImxhbmd1YWdlXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtYmFja2dyb3VuZC11cGxvYWRcIjogXCJiYWNrZ3JvdW5kVXBsb2FkXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtaGlkZVwiOiBcImhpZGVcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1jdXN0b20tY3NzXCI6IFwiY3VzdG9tQ3NzXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtY3JvcC1mb3JjZVwiOiBcImNyb3BGb3JjZVwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWNyb3AtcmF0aW9cIjogXCJjcm9wUmF0aW9cIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1jcm9wLWRpbVwiOiBcImNyb3BEaW1cIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1jcm9wLW1heFwiOiBcImNyb3BNYXhcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1jcm9wLW1pblwiOiBcImNyb3BNaW5cIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1zaG93LWNsb3NlXCI6IFwic2hvd0Nsb3NlXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtY29udmVyc2lvbnNcIjogXCJjb252ZXJzaW9uc1wiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWN1c3RvbS10ZXh0XCI6IFwiY3VzdG9tVGV4dFwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWN1c3RvbS1zb3VyY2UtY29udGFpbmVyXCI6IFwiY3VzdG9tU291cmNlQ29udGFpbmVyXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtY3VzdG9tLXNvdXJjZS1wYXRoXCI6IFwiY3VzdG9tU291cmNlUGF0aFwiXG4gICAgICAgIH0sIHBpY2tPbmx5T3B0aW9uc01hcCA9IHtcbiAgICAgICAgICAgIFwiZGF0YS1mcC1taW1ldHlwZXNcIjogXCJtaW1ldHlwZXNcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1leHRlbnNpb25zXCI6IFwiZXh0ZW5zaW9uc1wiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLW1heFNpemVcIjogXCJtYXhTaXplXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtbWF4RmlsZXNcIjogXCJtYXhGaWxlc1wiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLXN0b3JlLWxvY2F0aW9uXCI6IFwic3RvcmVMb2NhdGlvblwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLXN0b3JlLXBhdGhcIjogXCJzdG9yZVBhdGhcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1zdG9yZS1jb250YWluZXJcIjogXCJzdG9yZUNvbnRhaW5lclwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLXN0b3JlLXJlZ2lvblwiOiBcInN0b3JlUmVnaW9uXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtc3RvcmUtYWNjZXNzXCI6IFwic3RvcmVBY2Nlc3NcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1pbWFnZS1xdWFsaXR5XCI6IFwiaW1hZ2VRdWFsaXR5XCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtaW1hZ2UtZGltXCI6IFwiaW1hZ2VEaW1cIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1pbWFnZS1tYXhcIjogXCJpbWFnZU1heFwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWltYWdlLW1pblwiOiBcImltYWdlTWluXCJcbiAgICAgICAgfSwgd2ViY2FtT3B0aW9uc01hcCA9IHtcbiAgICAgICAgICAgIFwiZGF0YS1mcC12aWRlby1yZWNvcmRpbmctcmVzb2x1dGlvblwiOiBcInZpZGVvUmVzXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtd2ViY2FtLWRpbVwiOiBcIndlYmNhbURpbVwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLXZpZGVvLWxlbmd0aFwiOiBcInZpZGVvTGVuXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtYXVkaW8tbGVuZ3RoXCI6IFwiYXVkaW9MZW5cIlxuICAgICAgICB9O1xuICAgICAgICBzZXRBdHRySWZFeGlzdHNBcnJheShmcG9wdGlvbnMsIGRvbUVsZW1lbnQsIGdlbmVyYWxPcHRpb25zTWFwKTtcbiAgICAgICAgaWYgKG1vZGUgPT09IFwiZXhwb3J0XCIpIHtcbiAgICAgICAgICAgIHNldEF0dHJJZkV4aXN0cyhcInN1Z2dlc3RlZEZpbGVuYW1lXCIsIGZwb3B0aW9ucywgXCJkYXRhLWZwLXN1Z2dlc3RlZEZpbGVuYW1lXCIsIGRvbUVsZW1lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKG1vZGUgPT09IFwicGlja1wiKSB7XG4gICAgICAgICAgICBzZXRBdHRySWZFeGlzdHNBcnJheShmcG9wdGlvbnMsIGRvbUVsZW1lbnQsIHBpY2tPbmx5T3B0aW9uc01hcCk7XG4gICAgICAgICAgICBmcG9wdGlvbnMud2ViY2FtID0ge307XG4gICAgICAgICAgICBzZXRBdHRySWZFeGlzdHNBcnJheShmcG9wdGlvbnMud2ViY2FtLCBkb21FbGVtZW50LCB3ZWJjYW1PcHRpb25zTWFwKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2VydmljZXMgPSBkb21FbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtZnAtc2VydmljZXNcIik7XG4gICAgICAgIGlmIChzZXJ2aWNlcykge1xuICAgICAgICAgICAgc2VydmljZXMgPSBzZXJ2aWNlcy5zcGxpdChcIixcIik7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNlcnZpY2VzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgc2VydmljZXNbal0gPSBmcC5zZXJ2aWNlc1tzZXJ2aWNlc1tqXS5yZXBsYWNlKFwiIFwiLCBcIlwiKV0gfHwgc2VydmljZXNbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcG9wdGlvbnMuc2VydmljZXMgPSBzZXJ2aWNlcztcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2VydmljZSA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1zZXJ2aWNlXCIpO1xuICAgICAgICBpZiAoc2VydmljZSkge1xuICAgICAgICAgICAgZnBvcHRpb25zLnNlcnZpY2UgPSBmcC5zZXJ2aWNlc1tzZXJ2aWNlLnJlcGxhY2UoXCIgXCIsIFwiXCIpXSB8fCBzZXJ2aWNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhcnJheVRvU3BsaXQgPSBbIFwiZXh0ZW5zaW9uc1wiLCBcIm1pbWV0eXBlc1wiLCBcImltYWdlRGltXCIsIFwiaW1hZ2VNaW5cIiwgXCJpbWFnZU1heFwiLCBcImNyb3BEaW1cIiwgXCJjcm9wTWF4XCIsIFwiY3JvcE1pblwiLCBcIndlYmNhbURpbVwiLCBcImNvbnZlcnNpb25zXCIgXTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGFycmF5VG9TcGxpdCkge1xuICAgICAgICAgICAgc3BsaXRJZkV4aXN0KGFycmF5VG9TcGxpdFtrZXldLCBmcG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhcGlrZXkgPSBkb21FbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtZnAtYXBpa2V5XCIpO1xuICAgICAgICBpZiAoYXBpa2V5KSB7XG4gICAgICAgICAgICBmcC5zZXRLZXkoYXBpa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBmcG9wdGlvbnMuZm9sZGVycyA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1mb2xkZXJzXCIpID09PSBcInRydWVcIjtcbiAgICAgICAgcmV0dXJuIGZwb3B0aW9ucztcbiAgICB9O1xuICAgIHZhciBpc011bHRpcGxlID0gZnVuY3Rpb24oZG9tRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLW11bHRpcGxlXCIpID09PSBcInRydWVcIjtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3RQaWNrV2lkZ2V0ID0gZnVuY3Rpb24oZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgd2lkZ2V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICAgICAgd2lkZ2V0LnNldEF0dHJpYnV0ZShcInR5cGVcIiwgXCJidXR0b25cIik7XG4gICAgICAgIHdpZGdldC5pbm5lckhUTUwgPSBkb21FbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtZnAtYnV0dG9uLXRleHRcIikgfHwgXCJQaWNrIEZpbGVcIjtcbiAgICAgICAgd2lkZ2V0LmNsYXNzTmFtZSA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1idXR0b24tY2xhc3NcIikgfHwgZG9tRWxlbWVudC5jbGFzc05hbWUgfHwgXCJmcF9fYnRuXCI7XG4gICAgICAgIGRvbUVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICB2YXIgZnBvcHRpb25zID0gY29uc3RydWN0T3B0aW9ucyhkb21FbGVtZW50KTtcbiAgICAgICAgaWYgKGlzTXVsdGlwbGUoZG9tRWxlbWVudCkpIHtcbiAgICAgICAgICAgIHdpZGdldC5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgd2lkZ2V0LmJsdXIoKTtcbiAgICAgICAgICAgICAgICBmcC5waWNrTXVsdGlwbGUoZnBvcHRpb25zLCBmdW5jdGlvbihmcGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cmxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZnBmaWxlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXJscy5wdXNoKGZwZmlsZXNbal0udXJsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkb21FbGVtZW50LnZhbHVlID0gdXJscy5qb2luKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcmVPbkNoYW5nZUV2ZW50KGRvbUVsZW1lbnQsIGZwZmlsZXMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aWRnZXQub25jbGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHdpZGdldC5ibHVyKCk7XG4gICAgICAgICAgICAgICAgZnAucGljayhmcG9wdGlvbnMsIGZ1bmN0aW9uKGZwZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBkb21FbGVtZW50LnZhbHVlID0gZnBmaWxlLnVybDtcbiAgICAgICAgICAgICAgICAgICAgZmlyZU9uQ2hhbmdlRXZlbnQoZG9tRWxlbWVudCwgWyBmcGZpbGUgXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBkb21FbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHdpZGdldCwgZG9tRWxlbWVudC5uZXh0U2libGluZyk7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0Q29udmVydFdpZGdldCA9IGZ1bmN0aW9uKGRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHVybCA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC11cmxcIik7XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgd2lkZ2V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICAgICAgd2lkZ2V0LnNldEF0dHJpYnV0ZShcInR5cGVcIiwgXCJidXR0b25cIik7XG4gICAgICAgIHdpZGdldC5pbm5lckhUTUwgPSBkb21FbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtZnAtYnV0dG9uLXRleHRcIikgfHwgXCJDb252ZXJ0IEZpbGVcIjtcbiAgICAgICAgd2lkZ2V0LmNsYXNzTmFtZSA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1idXR0b24tY2xhc3NcIikgfHwgZG9tRWxlbWVudC5jbGFzc05hbWUgfHwgXCJmcF9fYnRuXCI7XG4gICAgICAgIGRvbUVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICB2YXIgZnBvcHRpb25zID0gY29uc3RydWN0T3B0aW9ucyhkb21FbGVtZW50LCBcImNvbnZlcnRcIik7XG4gICAgICAgIHdpZGdldC5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB3aWRnZXQuYmx1cigpO1xuICAgICAgICAgICAgZnAucHJvY2Vzc0ltYWdlKHVybCwgZnBvcHRpb25zLCBmdW5jdGlvbihmcGZpbGUpIHtcbiAgICAgICAgICAgICAgICBkb21FbGVtZW50LnZhbHVlID0gZnBmaWxlLnVybDtcbiAgICAgICAgICAgICAgICBmaXJlT25DaGFuZ2VFdmVudChkb21FbGVtZW50LCBbIGZwZmlsZSBdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgICBkb21FbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHdpZGdldCwgZG9tRWxlbWVudC5uZXh0U2libGluZyk7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0RHJhZ1dpZGdldCA9IGZ1bmN0aW9uKGRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHBhbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBwYW5lLmNsYXNzTmFtZSA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1jbGFzc1wiKSB8fCBkb21FbGVtZW50LmNsYXNzTmFtZTtcbiAgICAgICAgcGFuZS5zdHlsZS5wYWRkaW5nID0gXCIxcHhcIjtcbiAgICAgICAgZG9tRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIGRvbUVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUocGFuZSwgZG9tRWxlbWVudC5uZXh0U2libGluZyk7XG4gICAgICAgIHZhciBwaWNrQnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICAgICAgcGlja0J1dHRvbi5zZXRBdHRyaWJ1dGUoXCJ0eXBlXCIsIFwiYnV0dG9uXCIpO1xuICAgICAgICBwaWNrQnV0dG9uLmlubmVySFRNTCA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1idXR0b24tdGV4dFwiKSB8fCBcIlBpY2sgRmlsZVwiO1xuICAgICAgICBwaWNrQnV0dG9uLmNsYXNzTmFtZSA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1idXR0b24tY2xhc3NcIikgfHwgXCJmcF9fYnRuXCI7XG4gICAgICAgIHBhbmUuYXBwZW5kQ2hpbGQocGlja0J1dHRvbik7XG4gICAgICAgIHZhciBkcmFnUGFuZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHNldHVwRHJhZ0NvbnRhaW5lcihkcmFnUGFuZSk7XG4gICAgICAgIGRyYWdQYW5lLmlubmVySFRNTCA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1kcmFnLXRleHRcIikgfHwgXCJPciBkcm9wIGZpbGVzIGhlcmVcIjtcbiAgICAgICAgZHJhZ1BhbmUuY2xhc3NOYW1lID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLWRyYWctY2xhc3NcIikgfHwgXCJcIjtcbiAgICAgICAgcGFuZS5hcHBlbmRDaGlsZChkcmFnUGFuZSk7XG4gICAgICAgIHZhciBmcG9wdGlvbnMgPSBjb25zdHJ1Y3RPcHRpb25zKGRvbUVsZW1lbnQpLCBtdWx0aXBsZSA9IGlzTXVsdGlwbGUoZG9tRWxlbWVudCk7XG4gICAgICAgIGlmIChmcC5kcmFnZHJvcC5lbmFibGVkKCkpIHtcbiAgICAgICAgICAgIHNldHVwRHJvcFBhbmUoZHJhZ1BhbmUsIG11bHRpcGxlLCBmcG9wdGlvbnMsIGRvbUVsZW1lbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHJhZ1BhbmUuaW5uZXJIVE1MID0gXCImbmJzcDtcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgIGRyYWdQYW5lLm9uY2xpY2sgPSBwaWNrQnV0dG9uLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBwaWNrQnV0dG9uLmJsdXIoKTtcbiAgICAgICAgICAgICAgICBmcC5waWNrTXVsdGlwbGUoZnBvcHRpb25zLCBmdW5jdGlvbihmcGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cmxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWxlbmFtZXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBmcGZpbGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmxzLnB1c2goZnBmaWxlc1tqXS51cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWVzLnB1c2goZnBmaWxlc1tqXS5maWxlbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZG9tRWxlbWVudC52YWx1ZSA9IHVybHMuam9pbigpO1xuICAgICAgICAgICAgICAgICAgICBvbkZpbGVzVXBsb2FkZWQoZG9tRWxlbWVudCwgZHJhZ1BhbmUsIGZpbGVuYW1lcy5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgICAgICAgICBmaXJlT25DaGFuZ2VFdmVudChkb21FbGVtZW50LCBmcGZpbGVzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHJhZ1BhbmUub25jbGljayA9IHBpY2tCdXR0b24ub25jbGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHBpY2tCdXR0b24uYmx1cigpO1xuICAgICAgICAgICAgICAgIGZwLnBpY2soZnBvcHRpb25zLCBmdW5jdGlvbihmcGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tRWxlbWVudC52YWx1ZSA9IGZwZmlsZS51cmw7XG4gICAgICAgICAgICAgICAgICAgIG9uRmlsZXNVcGxvYWRlZChkb21FbGVtZW50LCBkcmFnUGFuZSwgZnBmaWxlLmZpbGVuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgZmlyZU9uQ2hhbmdlRXZlbnQoZG9tRWxlbWVudCwgWyBmcGZpbGUgXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIG9uRmlsZXNVcGxvYWRlZCA9IGZ1bmN0aW9uKGlucHV0LCBvZHJhZywgdGV4dCkge1xuICAgICAgICBvZHJhZy5pbm5lckhUTUwgPSB0ZXh0O1xuICAgICAgICBvZHJhZy5zdHlsZS5wYWRkaW5nID0gXCIycHggNHB4XCI7XG4gICAgICAgIG9kcmFnLnN0eWxlLmN1cnNvciA9IFwiZGVmYXVsdFwiO1xuICAgICAgICBvZHJhZy5zdHlsZS53aWR0aCA9IFwiXCI7XG4gICAgICAgIHZhciBjYW5jZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcbiAgICAgICAgY2FuY2VsLmlubmVySFRNTCA9IFwiWFwiO1xuICAgICAgICBjYW5jZWwuc3R5bGUuYm9yZGVyUmFkaXVzID0gXCI4cHhcIjtcbiAgICAgICAgY2FuY2VsLnN0eWxlLmZvbnRTaXplID0gXCIxNHB4XCI7XG4gICAgICAgIGNhbmNlbC5zdHlsZS5jc3NGbG9hdCA9IFwicmlnaHRcIjtcbiAgICAgICAgY2FuY2VsLnN0eWxlLnBhZGRpbmcgPSBcIjAgM3B4XCI7XG4gICAgICAgIGNhbmNlbC5zdHlsZS5jb2xvciA9IFwiIzYwMFwiO1xuICAgICAgICBjYW5jZWwuc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XG4gICAgICAgIHZhciBjbGlja0ZuID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKCFlKSB7XG4gICAgICAgICAgICAgICAgZSA9IHdpbmRvdy5ldmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikge1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXR1cERyYWdDb250YWluZXIob2RyYWcpO1xuICAgICAgICAgICAgaWYgKCFmcC5kcmFnZHJvcC5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgb2RyYWcuaW5uZXJIVE1MID0gXCImbmJzcDtcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb2RyYWcuaW5uZXJIVE1MID0gaW5wdXQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1kcmFnLXRleHRcIikgfHwgXCJPciBkcm9wIGZpbGVzIGhlcmVcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlucHV0LnZhbHVlID0gXCJcIjtcbiAgICAgICAgICAgIGZpcmVPbkNoYW5nZUV2ZW50KGlucHV0KTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGNhbmNlbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICBjYW5jZWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNsaWNrRm4sIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChjYW5jZWwuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgIGNhbmNlbC5hdHRhY2hFdmVudChcIm9uY2xpY2tcIiwgY2xpY2tGbik7XG4gICAgICAgIH1cbiAgICAgICAgb2RyYWcuYXBwZW5kQ2hpbGQoY2FuY2VsKTtcbiAgICB9O1xuICAgIHZhciBzZXR1cERyYWdDb250YWluZXIgPSBmdW5jdGlvbihkcmFnUGFuZSkge1xuICAgICAgICBkcmFnUGFuZS5zdHlsZS5ib3JkZXIgPSBcIjFweCBkYXNoZWQgI0FBQVwiO1xuICAgICAgICBkcmFnUGFuZS5zdHlsZS5kaXNwbGF5ID0gXCJpbmxpbmUtYmxvY2tcIjtcbiAgICAgICAgZHJhZ1BhbmUuc3R5bGUubWFyZ2luID0gXCIwIDAgMCA0cHhcIjtcbiAgICAgICAgZHJhZ1BhbmUuc3R5bGUuYm9yZGVyUmFkaXVzID0gXCIzcHhcIjtcbiAgICAgICAgZHJhZ1BhbmUuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCIjRjNGM0YzXCI7XG4gICAgICAgIGRyYWdQYW5lLnN0eWxlLmNvbG9yID0gXCIjMzMzXCI7XG4gICAgICAgIGRyYWdQYW5lLnN0eWxlLmZvbnRTaXplID0gXCIxNHB4XCI7XG4gICAgICAgIGRyYWdQYW5lLnN0eWxlLmxpbmVIZWlnaHQgPSBcIjIycHhcIjtcbiAgICAgICAgZHJhZ1BhbmUuc3R5bGUucGFkZGluZyA9IFwiMnB4IDRweFwiO1xuICAgICAgICBkcmFnUGFuZS5zdHlsZS52ZXJ0aWNhbEFsaWduID0gXCJtaWRkbGVcIjtcbiAgICAgICAgZHJhZ1BhbmUuc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XG4gICAgICAgIGRyYWdQYW5lLnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcbiAgICB9O1xuICAgIHZhciBzZXR1cERyb3BQYW5lID0gZnVuY3Rpb24ob2RyYWcsIG11bHRpcGxlLCBmcG9wdGlvbnMsIGlucHV0KSB7XG4gICAgICAgIHZhciB0ZXh0ID0gb2RyYWcuaW5uZXJIVE1MO1xuICAgICAgICB2YXIgcGJhcjtcbiAgICAgICAgZnAuZHJhZ2Ryb3AubWFrZURyb3BQYW5lKG9kcmFnLCB7XG4gICAgICAgICAgICBtdWx0aXBsZTogbXVsdGlwbGUsXG4gICAgICAgICAgICBtYXhTaXplOiBmcG9wdGlvbnMubWF4U2l6ZSxcbiAgICAgICAgICAgIG1pbWV0eXBlczogZnBvcHRpb25zLm1pbWV0eXBlcyxcbiAgICAgICAgICAgIG1pbWV0eXBlOiBmcG9wdGlvbnMubWltZXR5cGUsXG4gICAgICAgICAgICBleHRlbnNpb25zOiBmcG9wdGlvbnMuZXh0ZW5zaW9ucyxcbiAgICAgICAgICAgIGV4dGVuc2lvbjogZnBvcHRpb25zLmV4dGVuc2lvbixcbiAgICAgICAgICAgIGxvY2F0aW9uOiBmcG9wdGlvbnMuc3RvcmVMb2NhdGlvbixcbiAgICAgICAgICAgIHBhdGg6IGZwb3B0aW9ucy5zdG9yZVBhdGgsXG4gICAgICAgICAgICBjb250YWluZXI6IGZwb3B0aW9ucy5zdG9yZUNvbnRhaW5lcixcbiAgICAgICAgICAgIHJlZ2lvbjogZnBvcHRpb25zLnN0b3JlUmVnaW9uLFxuICAgICAgICAgICAgYWNjZXNzOiBmcG9wdGlvbnMuc3RvcmVBY2Nlc3MsXG4gICAgICAgICAgICBwb2xpY3k6IGZwb3B0aW9ucy5wb2xpY3ksXG4gICAgICAgICAgICBzaWduYXR1cmU6IGZwb3B0aW9ucy5zaWduYXR1cmUsXG4gICAgICAgICAgICBkcmFnRW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIG9kcmFnLmlubmVySFRNTCA9IFwiRHJvcCB0byB1cGxvYWRcIjtcbiAgICAgICAgICAgICAgICBvZHJhZy5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNFMEUwRTBcIjtcbiAgICAgICAgICAgICAgICBvZHJhZy5zdHlsZS5ib3JkZXIgPSBcIjFweCBzb2xpZCAjMDAwXCI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZ0xlYXZlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBvZHJhZy5pbm5lckhUTUwgPSB0ZXh0O1xuICAgICAgICAgICAgICAgIG9kcmFnLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiI0YzRjNGM1wiO1xuICAgICAgICAgICAgICAgIG9kcmFnLnN0eWxlLmJvcmRlciA9IFwiMXB4IGRhc2hlZCAjQUFBXCI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogZnVuY3Rpb24odHlwZSwgbXNnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09IFwiVG9vTWFueUZpbGVzXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb2RyYWcuaW5uZXJIVE1MID0gbXNnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJXcm9uZ1R5cGVcIikge1xuICAgICAgICAgICAgICAgICAgICBvZHJhZy5pbm5lckhUTUwgPSBtc2c7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBcIk5vRmlsZXNGb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9kcmFnLmlubmVySFRNTCA9IG1zZztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwiVXBsb2FkRXJyb3JcIikge1xuICAgICAgICAgICAgICAgICAgICBvZHJhZy5pbm5lckhUTUwgPSBcIk9vcHMhIEhhZCB0cm91YmxlIHVwbG9hZGluZy5cIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdGFydDogZnVuY3Rpb24oZmlsZXMpIHtcbiAgICAgICAgICAgICAgICBwYmFyID0gc2V0dXBQcm9ncmVzcyhvZHJhZyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Qcm9ncmVzczogZnVuY3Rpb24ocGVyY2VudGFnZSkge1xuICAgICAgICAgICAgICAgIGlmIChwYmFyKSB7XG4gICAgICAgICAgICAgICAgICAgIHBiYXIuc3R5bGUud2lkdGggPSBwZXJjZW50YWdlICsgXCIlXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzczogZnVuY3Rpb24oZnBmaWxlcykge1xuICAgICAgICAgICAgICAgIHZhciB2YWxzID0gW107XG4gICAgICAgICAgICAgICAgdmFyIGZpbGVuYW1lcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZnBmaWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YWxzLnB1c2goZnBmaWxlc1tpXS51cmwpO1xuICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZXMucHVzaChmcGZpbGVzW2ldLmZpbGVuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSB2YWxzLmpvaW4oKTtcbiAgICAgICAgICAgICAgICBvbkZpbGVzVXBsb2FkZWQoaW5wdXQsIG9kcmFnLCBmaWxlbmFtZXMuam9pbihcIiwgXCIpKTtcbiAgICAgICAgICAgICAgICBmaXJlT25DaGFuZ2VFdmVudChpbnB1dCwgZnBmaWxlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgdmFyIHNldHVwUHJvZ3Jlc3MgPSBmdW5jdGlvbihvZHJhZykge1xuICAgICAgICB2YXIgcGJhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBoZWlnaHQgPSBvZHJhZy5vZmZzZXRIZWlnaHQgLSAyO1xuICAgICAgICBwYmFyLnN0eWxlLmhlaWdodCA9IGhlaWdodCArIFwicHhcIjtcbiAgICAgICAgcGJhci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBcIiMwRTkwRDJcIjtcbiAgICAgICAgcGJhci5zdHlsZS53aWR0aCA9IFwiMiVcIjtcbiAgICAgICAgcGJhci5zdHlsZS5ib3JkZXJSYWRpdXMgPSBcIjNweFwiO1xuICAgICAgICBvZHJhZy5zdHlsZS53aWR0aCA9IG9kcmFnLm9mZnNldFdpZHRoICsgXCJweFwiO1xuICAgICAgICBvZHJhZy5zdHlsZS5wYWRkaW5nID0gXCIwXCI7XG4gICAgICAgIG9kcmFnLnN0eWxlLmJvcmRlciA9IFwiMXB4IHNvbGlkICNBQUFcIjtcbiAgICAgICAgb2RyYWcuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCIjRjNGM0YzXCI7XG4gICAgICAgIG9kcmFnLnN0eWxlLmJveFNoYWRvdyA9IFwiaW5zZXQgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4xKVwiO1xuICAgICAgICBvZHJhZy5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICBvZHJhZy5hcHBlbmRDaGlsZChwYmFyKTtcbiAgICAgICAgcmV0dXJuIHBiYXI7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0RXhwb3J0V2lkZ2V0ID0gZnVuY3Rpb24oZG9tRWxlbWVudCkge1xuICAgICAgICBkb21FbGVtZW50Lm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSBkb21FbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtZnAtdXJsXCIpO1xuICAgICAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBmcG9wdGlvbnMgPSBjb25zdHJ1Y3RPcHRpb25zKGRvbUVsZW1lbnQsIFwiZXhwb3J0XCIpO1xuICAgICAgICAgICAgZnAuZXhwb3J0RmlsZSh1cmwsIGZwb3B0aW9ucyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgYnVpbGRXaWRnZXRzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKSB7XG4gICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgIHZhciBwaWNrX2Jhc2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwiZmlsZXBpY2tlclwiXScpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHBpY2tfYmFzZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0cnVjdFBpY2tXaWRnZXQocGlja19iYXNlW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkcmFnX3dpZGdldHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwiZmlsZXBpY2tlci1kcmFnZHJvcFwiXScpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGRyYWdfd2lkZ2V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0cnVjdERyYWdXaWRnZXQoZHJhZ193aWRnZXRzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjb252ZXJ0X3dpZGdldHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwiZmlsZXBpY2tlci1jb252ZXJ0XCJdJyk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY29udmVydF93aWRnZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3RydWN0Q29udmVydFdpZGdldChjb252ZXJ0X3dpZGdldHNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGV4cG9ydF9iYXNlID0gW107XG4gICAgICAgICAgICB2YXIgdG1wID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImJ1dHRvbltkYXRhLWZwLXVybF1cIik7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdG1wLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZXhwb3J0X2Jhc2UucHVzaCh0bXBbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG1wID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImFbZGF0YS1mcC11cmxdXCIpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHRtcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGV4cG9ydF9iYXNlLnB1c2godG1wW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRtcCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJidXR0b25cIl1bZGF0YS1mcC11cmxdJyk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdG1wLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZXhwb3J0X2Jhc2UucHVzaCh0bXBbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGV4cG9ydF9iYXNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3RydWN0RXhwb3J0V2lkZ2V0KGV4cG9ydF9iYXNlW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBwcmV2aWV3cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1t0eXBlPVwiZmlsZXBpY2tlci1wcmV2aWV3XCJdW2RhdGEtZnAtdXJsXScpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHByZXZpZXdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3RydWN0UHJldmlldyhwcmV2aWV3c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhcHBlbmRTdHlsZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0V2lkZ2V0ID0gZnVuY3Rpb24oYmFzZSkge1xuICAgICAgICBpZiAoYmFzZS5qcXVlcnkpIHtcbiAgICAgICAgICAgIGJhc2UgPSBiYXNlWzBdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBiYXNlX3R5cGUgPSBiYXNlLmdldEF0dHJpYnV0ZShcInR5cGVcIik7XG4gICAgICAgIGlmIChiYXNlX3R5cGUgPT09IFwiZmlsZXBpY2tlclwiKSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RQaWNrV2lkZ2V0KGJhc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKGJhc2VfdHlwZSA9PT0gXCJmaWxlcGlja2VyLWRyYWdkcm9wXCIpIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdERyYWdXaWRnZXQoYmFzZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoYmFzZV90eXBlID09PSBcImZpbGVwaWNrZXItcHJldmlld1wiKSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RQcmV2aWV3KGJhc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKGJhc2UuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1zcmNcIikpIHtcbiAgICAgICAgICAgIGZwLnJlc3BvbnNpdmVJbWFnZXMuY29uc3RydWN0KGJhc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3RydWN0RXhwb3J0V2lkZ2V0KGJhc2UpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0UHJldmlldyA9IGZ1bmN0aW9uKGRvbUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHVybCA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC11cmxcIiksIGNzcyA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1jdXN0b20tY3NzXCIpO1xuICAgICAgICB2YXIgdXJsID0gZnAudXRpbC5nZXRGUFVybCh1cmwpO1xuICAgICAgICBpZiAoIXVybCB8fCAhZnAudXRpbC5pc0ZQVXJsKHVybCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoXCJhcGkvZmlsZS9cIiwgXCJhcGkvcHJldmlldy9cIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpZnJhbWVcIik7XG4gICAgICAgIGlmIChjc3MpIHtcbiAgICAgICAgICAgIHVybCA9IGZwLnV0aWwuYXBwZW5kUXVlcnlUb1VybCh1cmwsIFwiY3NzXCIsIGNzcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWZyYW1lLnNyYyA9IHVybDtcbiAgICAgICAgaWZyYW1lLndpZHRoID0gXCIxMDAlXCI7XG4gICAgICAgIGlmcmFtZS5oZWlnaHQgPSBcIjEwMCVcIjtcbiAgICAgICAgZG9tRWxlbWVudC5hcHBlbmRDaGlsZChpZnJhbWUpO1xuICAgIH07XG4gICAgZnVuY3Rpb24gYXBwZW5kU3R5bGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YXIgY3NzID0gJy5mcF9fYnRuey13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O2JveC1zaXppbmc6Ym9yZGVyLWJveDtkaXNwbGF5OmlubGluZS1ibG9jaztoZWlnaHQ6MzRweDtwYWRkaW5nOjRweCAzMHB4IDVweCA0MHB4O3Bvc2l0aW9uOnJlbGF0aXZlO21hcmdpbi1ib3R0b206MDt2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7LW1zLXRvdWNoLWFjdGlvbjptYW5pcHVsYXRpb247dG91Y2gtYWN0aW9uOm1hbmlwdWxhdGlvbjtjdXJzb3I6cG9pbnRlcjstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7LW1vei11c2VyLXNlbGVjdDpub25lOy1tcy11c2VyLXNlbGVjdDpub25lO3VzZXItc2VsZWN0Om5vbmU7Zm9udC1mYW1pbHk6XCJPcGVuIFNhbnNcIiwgc2Fucy1zZXJpZjtmb250LXNpemU6MTJweDtmb250LXdlaWdodDo2MDA7bGluZS1oZWlnaHQ6MS40Mjg1NzE0Mztjb2xvcjojZmZmO3RleHQtYWxpZ246Y2VudGVyO3doaXRlLXNwYWNlOm5vd3JhcDtiYWNrZ3JvdW5kOiNlZjQ5MjU7YmFja2dyb3VuZC1pbWFnZTp1cmwoXCJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJJQUFBQVZDQVlBQUFCTHk3N3ZBQUFBQkdkQlRVRUFBTEdQQy94aEJRQUFBSlJKUkVGVU9CSE5VY0VXZ0NBSXkxNGZibDllZ0s1TVJhckhRUzdvY0FObU9DZ1doMWdkTkVSaWcxQ2d3UGxMeGtadUU4MG5kSGxVKzRMZGExenowbTAxZFNLdGN6MGg3cXBRYjdXUitIeXJxUlB4YWh6d3dNcXFrRVZzNnFudis4Nk5RQWJjSmxLL1grdk1lTWU3WGNCT1lhUnpjYkl0VVI3LzhRZ2N5a21FbFFyUVBFcm5teE54bDJ5eWl3Y2dFdlFVb2NJSmFFNnlFUndxWERJQUFBQUFTVVZPUks1Q1lJST1cIik7YmFja2dyb3VuZC1yZXBlYXQ6bm8tcmVwZWF0O2JhY2tncm91bmQtcG9zaXRpb246MTVweCA2cHg7Ym9yZGVyOjFweCBzb2xpZCB0cmFuc3BhcmVudDtib3JkZXItcmFkaXVzOjE3cHh9LmZwX19idG46aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjojZDY0NTMzfS5mcF9fYnRuOjphZnRlcntwb3NpdGlvbjphYnNvbHV0ZTtjb250ZW50OlwiXCI7dG9wOjE1cHg7cmlnaHQ6MTRweDt3aWR0aDo3cHg7aGVpZ2h0OjRweDtiYWNrZ3JvdW5kOnVybChcImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWNBQUFBSUNBWUFBQUExQk9VR0FBQUFCR2RCVFVFQUFMR1BDL3hoQlFBQUFHbEpSRUZVQ0Ixai9QLy92dzREQTRNaUVLT0QrMHhBa2F0QS9BSk5Cc1MveXNUSXlQZ2Z5RGdIeE8raENrRDBPYWc0UkFob1BEc1FtNE5vcUNJR0JpQm5BaEJqQXhOQWtreEF2QlpORnNRSHVRZXNteFBJT1FaVkFLSTU0VVpERllnQUJiY0JzUWhNQWdESVZHWVNxWnNuNndBQUFBQkpSVTVFcmtKZ2dnPT1cIik7fS5mcF9fYnRuOmhvdmVyOjphZnRlcntiYWNrZ3JvdW5kLXBvc2l0aW9uOjAgLTRweDt9LmZwX19idG46YWN0aXZlLC5mcF9fYnRuOmZvY3Vze291dGxpbmU6bm9uZX1AbWVkaWEgb25seSBzY3JlZW4gYW5kIChtaW4tLW1vei1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKC1vLW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIgLyAxKSwgb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpey5mcF9fYnRue2JhY2tncm91bmQtaW1hZ2U6dXJsKFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFDUUFBQUFxQ0FZQUFBRGJDdm5vQUFBQUJHZEJUVUVBQUxHUEMveGhCUUFBQVFGSlJFRlVXQW50V0VFU3dqQUliQndmSGwrdXBOb1JOaktVSmhrNWtJdlpRR0c3YkhPd1BHbHRnZFl0RUplZFNoS3lKbkxIaEVJTHoxWmk5SENPekZJN0ZVcUZMQVdzZURnUGRmZVE5UVo0YjFqNTNuc3RuRUpKeUJxeDIwTmVUMWdFTUI1dVpHNkZ6bjVsVjVVTXAxQVNRaE1qZG52b3FqZXdzWWJEamN5dEVINWxzeFVMcDFBUzBzeDhuSmZWbmpnYW5mM05rVmxLaFZQSWZROVpiNmpGMGF0SzNtTnJpWHdwaWNQSHZJZXlyM3NUREE1M1ZncGdIOEJ2TXUxWkNDejdldy83TVB3bEU0Q1FKUE5uUWoyWlg0U1lsRVBiVnBzdktGWjVUT3doY1JvVVRRaXd3aFZqQXJQRXFWdlJoTUNuZU1YekRrOWx3WXBoSXdyWlpPaWhGMzJvZWhNQWExcVNBQUFBQUVsRlRrU3VRbUNDXCIpO2JhY2tncm91bmQtc2l6ZToxOHB4IDIxcHh9LmZwX19idG46OmFmdGVye2JhY2tncm91bmQ6dXJsKFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBNEFBQUFRQ0FZQUFBQW1sRTQ2QUFBQUJHZEJUVUVBQUxHUEMveGhCUUFBQU5wSlJFRlVLQldWa1U4S2dsQVl4Si91M0h1QndtVVg4QnFlcEtONGthNFJndURPVll1MlFWQ3JoSUo2L2NhZWtxTGlHeGkrUHpQRDU4UEFXcnN6eG15Z0Q4NGg3aHBlUEZMeTFtRVFCSmFtZ3ZjVllYa3FaWFRSMEx3cEpXdzB6MEJhNmJ5bURjckk0a2twNEV2ekNOb1Z6dE5LZlZBVHdvT2l5eC9ORHVwMVNWcVBRVkJiRERlSzN0eEJiOUp1SGZoTlczSFdqWmhEWCtTR1JBZ1BIa2w1ZjAra2llQnhSVmllYVBENUxHSjRXZ2hMaXdlaGJrQkk0SFVpckYzUytTWXJoaFEyZjJIMTZhUjV2TVNZd2Jkak50WVhaMEo3Y2M3MEJYbkZNSElHem56RUFBQUFBRWxGVGtTdVFtQ0NcIik7YmFja2dyb3VuZC1zaXplOjdweCA4cHg7fX0nO1xuICAgICAgICAgICAgdmFyIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXSwgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gICAgICAgICAgICBzdHlsZS50eXBlID0gXCJ0ZXh0L2Nzc1wiO1xuICAgICAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge31cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY29uc3RydWN0UGlja1dpZGdldDogY29uc3RydWN0UGlja1dpZGdldCxcbiAgICAgICAgY29uc3RydWN0RHJhZ1dpZGdldDogY29uc3RydWN0RHJhZ1dpZGdldCxcbiAgICAgICAgY29uc3RydWN0RXhwb3J0V2lkZ2V0OiBjb25zdHJ1Y3RFeHBvcnRXaWRnZXQsXG4gICAgICAgIGJ1aWxkV2lkZ2V0czogYnVpbGRXaWRnZXRzLFxuICAgICAgICBjb25zdHJ1Y3RXaWRnZXQ6IGNvbnN0cnVjdFdpZGdldFxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbihmdW5jdGlvbigpIHtcbiAgICBmaWxlcGlja2VyLmludGVybmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZnAgPSB0aGlzO1xuICAgICAgICBmcC51dGlsLmFkZE9uTG9hZChmcC5jb29raWVzLmNoZWNrVGhpcmRQYXJ0eSk7XG4gICAgICAgIGZwLnV0aWwuYWRkT25Mb2FkKGZwLndpZGdldHMuYnVpbGRXaWRnZXRzKTtcbiAgICAgICAgZnAudXRpbC5hZGRPbkxvYWQoZnAucmVzcG9uc2l2ZUltYWdlcy5hY3RpdmF0ZSk7XG4gICAgfSk7XG4gICAgZGVsZXRlIGZpbGVwaWNrZXIuaW50ZXJuYWw7XG4gICAgZGVsZXRlIGZpbGVwaWNrZXIuZXh0ZW5kO1xuICAgIHZhciBxdWV1ZSA9IGZpbGVwaWNrZXIuX3F1ZXVlIHx8IFtdO1xuICAgIHZhciBhcmdzO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgaWYgKGxlbikge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzID0gcXVldWVbaV07XG4gICAgICAgICAgICBmaWxlcGlja2VyW2FyZ3NbMF1dLmFwcGx5KGZpbGVwaWNrZXIsIGFyZ3NbMV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChmaWxlcGlja2VyLl9xdWV1ZSkge1xuICAgICAgICBkZWxldGUgZmlsZXBpY2tlci5fcXVldWU7XG4gICAgfVxufSkoKTsiLCIvKlxuICAgIE1vZHVsZSBkZWZpbml0aW9uIGZvciBicm93c2VyaWZ5XG4qL1xucmVxdWlyZSgnLi9kaXN0L2ZpbGVwaWNrZXInKTtcbm1vZHVsZS5leHBvcnRzID0gZmlsZXBpY2tlcjtcbiJdfQ==
