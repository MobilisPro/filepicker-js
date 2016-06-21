(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.filepicker = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJmaWxlcGlja2VyX2xvYy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxuKGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29udGV4dCA9IHt9O1xuICAgICAgICB2YXIgYWRkT2JqZWN0VG8gPSBmdW5jdGlvbihuYW1lLCBvYmosIGJhc2UpIHtcbiAgICAgICAgICAgIHZhciBwYXRoID0gbmFtZS5zcGxpdChcIi5cIik7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGgubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFiYXNlW3BhdGhbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2VbcGF0aFtpXV0gPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYmFzZSA9IGJhc2VbcGF0aFtpXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9iaiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai5pc0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2VbcGF0aFtpXV0gPSBvYmo7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYmFzZVtwYXRoW2ldXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iai5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYmFzZVtwYXRoW2ldXSA9IG9iajtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGV4dGVuZE9iamVjdCA9IGZ1bmN0aW9uKG5hbWUsIG9iaiwgaXNfcHVibGljKSB7XG4gICAgICAgICAgICBhZGRPYmplY3RUbyhuYW1lLCBvYmosIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYgKGlzX3B1YmxpYykge1xuICAgICAgICAgICAgICAgIGFkZE9iamVjdFRvKG5hbWUsIG9iaiwgd2luZG93LmZpbGVwaWNrZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB2YXIgZXh0ZW5kID0gZnVuY3Rpb24ocGtnLCBpbml0X2ZuLCBpc19wdWJsaWMpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGtnID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBpc19wdWJsaWMgPSBpbml0X2ZuO1xuICAgICAgICAgICAgICAgIGluaXRfZm4gPSBwa2c7XG4gICAgICAgICAgICAgICAgcGtnID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgICAgICAgICBwa2cgKz0gXCIuXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgb2JqcyA9IGluaXRfZm4uY2FsbChjb250ZXh0KTtcbiAgICAgICAgICAgIGZvciAodmFyIG9ial9uYW1lIGluIG9ianMpIHtcbiAgICAgICAgICAgICAgICBleHRlbmRPYmplY3QocGtnICsgb2JqX25hbWUsIG9ianNbb2JqX25hbWVdLCBpc19wdWJsaWMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB2YXIgaW50ZXJuYWwgPSBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgZm4uYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGV4dGVuZDogZXh0ZW5kLFxuICAgICAgICAgICAgaW50ZXJuYWw6IGludGVybmFsXG4gICAgICAgIH07XG4gICAgfSgpO1xuICAgIGlmICghd2luZG93LmZpbGVwaWNrZXIpIHtcbiAgICAgICAgd2luZG93LmZpbGVwaWNrZXIgPSBmcDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBhdHRyIGluIGZwKSB7XG4gICAgICAgICAgICB3aW5kb3cuZmlsZXBpY2tlclthdHRyXSA9IGZwW2F0dHJdO1xuICAgICAgICB9XG4gICAgfVxufSkoKTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwiY29tbVwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBDT01NX0lGUkFNRV9OQU1FID0gXCJmaWxlcGlja2VyX2NvbW1faWZyYW1lXCI7XG4gICAgdmFyIEFQSV9JRlJBTUVfTkFNRSA9IFwiZnBhcGlfY29tbV9pZnJhbWVcIjtcbiAgICB2YXIgb3BlbkNvbW1JZnJhbWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5mcmFtZXNbQ09NTV9JRlJBTUVfTkFNRV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgb3BlbkNvbW11bmljYXRpb25zQ2hhbm5lbCgpO1xuICAgICAgICAgICAgdmFyIGNvbW1JRnJhbWU7XG4gICAgICAgICAgICBjb21tSUZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgICAgICAgICAgIGNvbW1JRnJhbWUuaWQgPSBjb21tSUZyYW1lLm5hbWUgPSBDT01NX0lGUkFNRV9OQU1FO1xuICAgICAgICAgICAgY29tbUlGcmFtZS5zcmMgPSBmcC51cmxzLkNPTU07XG4gICAgICAgICAgICBjb21tSUZyYW1lLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY29tbUlGcmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdpbmRvdy5mcmFtZXNbQVBJX0lGUkFNRV9OQU1FXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBvcGVuQ29tbXVuaWNhdGlvbnNDaGFubmVsKCk7XG4gICAgICAgICAgICB2YXIgYXBpSUZyYW1lO1xuICAgICAgICAgICAgYXBpSUZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgICAgICAgICAgIGFwaUlGcmFtZS5pZCA9IGFwaUlGcmFtZS5uYW1lID0gQVBJX0lGUkFNRV9OQU1FO1xuICAgICAgICAgICAgYXBpSUZyYW1lLnNyYyA9IGZwLnVybHMuQVBJX0NPTU07XG4gICAgICAgICAgICBhcGlJRnJhbWUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhcGlJRnJhbWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29tbXVuaWNhdGlvbnNIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKGV2ZW50Lm9yaWdpbiAhPT0gZnAudXJscy5CQVNFICYmIGV2ZW50Lm9yaWdpbiAhPT0gZnAudXJscy5ESUFMT0dfQkFTRSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkYXRhID0gZnAuanNvbi5wYXJzZShldmVudC5kYXRhKTtcbiAgICAgICAgZnAuaGFuZGxlcnMucnVuKGRhdGEpO1xuICAgIH07XG4gICAgdmFyIGlzT3BlbiA9IGZhbHNlO1xuICAgIHZhciBvcGVuQ29tbXVuaWNhdGlvbnNDaGFubmVsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChpc09wZW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlzT3BlbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY29tbXVuaWNhdGlvbnNIYW5kbGVyLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSBpZiAod2luZG93LmF0dGFjaEV2ZW50KSB7XG4gICAgICAgICAgICB3aW5kb3cuYXR0YWNoRXZlbnQoXCJvbm1lc3NhZ2VcIiwgY29tbXVuaWNhdGlvbnNIYW5kbGVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiVW5zdXBwb3J0ZWQgYnJvd3NlclwiKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGRlc3Ryb3lDb21tSWZyYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNvbW11bmljYXRpb25zSGFuZGxlciwgZmFsc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5hdHRhY2hFdmVudCkge1xuICAgICAgICAgICAgd2luZG93LmRldGFjaEV2ZW50KFwib25tZXNzYWdlXCIsIGNvbW11bmljYXRpb25zSGFuZGxlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIlVuc3VwcG9ydGVkIGJyb3dzZXJcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpc09wZW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlzT3BlbiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpZnJhbWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoQ09NTV9JRlJBTUVfTkFNRSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWZyYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWZyYW1lc1tpXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGlmcmFtZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBkZWxldGUgd2luZG93LmZyYW1lc1tDT01NX0lGUkFNRV9OQU1FXTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgdmFyIGFwaV9pZnJhbWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoQVBJX0lGUkFNRV9OQU1FKTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBhcGlfaWZyYW1lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgYXBpX2lmcmFtZXNbal0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChhcGlfaWZyYW1lc1tqXSk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRlbGV0ZSB3aW5kb3cuZnJhbWVzW0FQSV9JRlJBTUVfTkFNRV07XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBvcGVuQ2hhbm5lbDogb3BlbkNvbW1JZnJhbWUsXG4gICAgICAgIGNsb3NlQ2hhbm5lbDogZGVzdHJveUNvbW1JZnJhbWVcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImNvbW1fZmFsbGJhY2tcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgRlBfQ09NTV9JRlJBTUVfTkFNRSA9IFwiZmlsZXBpY2tlcl9jb21tX2lmcmFtZVwiO1xuICAgIHZhciBIT1NUX0NPTU1fSUZSQU1FX05BTUUgPSBcImhvc3RfY29tbV9pZnJhbWVcIjtcbiAgICB2YXIgYmFzZV9ob3N0X2xvY2F0aW9uID0gXCJcIjtcbiAgICB2YXIgaGFzaF9jaGVja19pbnRlcnZhbCA9IDIwMDtcbiAgICB2YXIgb3BlbkNvbW1JZnJhbWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgb3Blbkhvc3RDb21tSWZyYW1lKCk7XG4gICAgfTtcbiAgICB2YXIgb3Blbkhvc3RDb21tSWZyYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh3aW5kb3cuZnJhbWVzW0hPU1RfQ09NTV9JRlJBTUVfTkFNRV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIGhvc3RDb21tSUZyYW1lO1xuICAgICAgICAgICAgaG9zdENvbW1JRnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO1xuICAgICAgICAgICAgaG9zdENvbW1JRnJhbWUuaWQgPSBob3N0Q29tbUlGcmFtZS5uYW1lID0gSE9TVF9DT01NX0lGUkFNRV9OQU1FO1xuICAgICAgICAgICAgYmFzZV9ob3N0X2xvY2F0aW9uID0gaG9zdENvbW1JRnJhbWUuc3JjID0gZnAudXJscy5jb25zdHJ1Y3RIb3N0Q29tbUZhbGxiYWNrKCk7XG4gICAgICAgICAgICBob3N0Q29tbUlGcmFtZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgICB2YXIgb25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgYmFzZV9ob3N0X2xvY2F0aW9uID0gaG9zdENvbW1JRnJhbWUuY29udGVudFdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuICAgICAgICAgICAgICAgIG9wZW5GUENvbW1JZnJhbWUoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoaG9zdENvbW1JRnJhbWUuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBob3N0Q29tbUlGcmFtZS5hdHRhY2hFdmVudChcIm9ubG9hZFwiLCBvbmxvYWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBob3N0Q29tbUlGcmFtZS5vbmxvYWQgPSBvbmxvYWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGhvc3RDb21tSUZyYW1lKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIG9wZW5GUENvbW1JZnJhbWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5mcmFtZXNbRlBfQ09NTV9JRlJBTUVfTkFNRV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIGZwQ29tbUlGcmFtZTtcbiAgICAgICAgICAgIGZwQ29tbUlGcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpZnJhbWVcIik7XG4gICAgICAgICAgICBmcENvbW1JRnJhbWUuaWQgPSBmcENvbW1JRnJhbWUubmFtZSA9IEZQX0NPTU1fSUZSQU1FX05BTUU7XG4gICAgICAgICAgICBmcENvbW1JRnJhbWUuc3JjID0gZnAudXJscy5GUF9DT01NX0ZBTExCQUNLICsgXCI/aG9zdF91cmw9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoYmFzZV9ob3N0X2xvY2F0aW9uKTtcbiAgICAgICAgICAgIGZwQ29tbUlGcmFtZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGZwQ29tbUlGcmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgb3BlbkNvbW11bmljYXRpb25zQ2hhbm5lbCgpO1xuICAgIH07XG4gICAgdmFyIGlzT3BlbiA9IGZhbHNlO1xuICAgIHZhciB0aW1lcjtcbiAgICB2YXIgbGFzdEhhc2ggPSBcIlwiO1xuICAgIHZhciBjaGVja0hhc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbW1faWZyYW1lID0gd2luZG93LmZyYW1lc1tGUF9DT01NX0lGUkFNRV9OQU1FXTtcbiAgICAgICAgaWYgKCFjb21tX2lmcmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBob3N0X2lmcmFtZSA9IGNvbW1faWZyYW1lLmZyYW1lc1tIT1NUX0NPTU1fSUZSQU1FX05BTUVdO1xuICAgICAgICBpZiAoIWhvc3RfaWZyYW1lKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGhhc2ggPSBob3N0X2lmcmFtZS5sb2NhdGlvbi5oYXNoO1xuICAgICAgICBpZiAoaGFzaCAmJiBoYXNoLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcbiAgICAgICAgICAgIGhhc2ggPSBoYXNoLnN1YnN0cigxKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzaCA9PT0gbGFzdEhhc2gpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBsYXN0SGFzaCA9IGhhc2g7XG4gICAgICAgIGlmICghbGFzdEhhc2gpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZGF0YTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRhdGEgPSBmcC5qc29uLnBhcnNlKGhhc2gpO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgZnAuaGFuZGxlcnMucnVuKGRhdGEpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgb3BlbkNvbW11bmljYXRpb25zQ2hhbm5lbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoaXNPcGVuKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpc09wZW4gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRpbWVyID0gd2luZG93LnNldEludGVydmFsKGNoZWNrSGFzaCwgaGFzaF9jaGVja19pbnRlcnZhbCk7XG4gICAgfTtcbiAgICB2YXIgZGVzdHJveUNvbW1JZnJhbWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwodGltZXIpO1xuICAgICAgICBpZiAoIWlzT3Blbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXNPcGVuID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlmcmFtZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZShGUF9DT01NX0lGUkFNRV9OQU1FKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpZnJhbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZnJhbWVzW2ldLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoaWZyYW1lc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRlbGV0ZSB3aW5kb3cuZnJhbWVzW0ZQX0NPTU1fSUZSQU1FX05BTUVdO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICBpZnJhbWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoSE9TVF9DT01NX0lGUkFNRV9OQU1FKTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGlmcmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmcmFtZXNbaV0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChpZnJhbWVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZGVsZXRlIHdpbmRvdy5mcmFtZXNbSE9TVF9DT01NX0lGUkFNRV9OQU1FXTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9O1xuICAgIHZhciBpc0VuYWJsZWQgPSAhKFwicG9zdE1lc3NhZ2VcIiBpbiB3aW5kb3cpO1xuICAgIHZhciBzZXRFbmFibGVkID0gZnVuY3Rpb24oZW5hYmxlZCkge1xuICAgICAgICBpZiAoZW5hYmxlZCAhPT0gaXNFbmFibGVkKSB7XG4gICAgICAgICAgICBpc0VuYWJsZWQgPSAhIWVuYWJsZWQ7XG4gICAgICAgICAgICBpZiAoaXNFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgb2xkX2NvbW07XG4gICAgdmFyIGFjdGl2YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIG9sZF9jb21tID0gZnAuY29tbTtcbiAgICAgICAgZnAuY29tbSA9IHtcbiAgICAgICAgICAgIG9wZW5DaGFubmVsOiBvcGVuQ29tbUlmcmFtZSxcbiAgICAgICAgICAgIGNsb3NlQ2hhbm5lbDogZGVzdHJveUNvbW1JZnJhbWVcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBkZWFjdGl2YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGZwLmNvbW0gPSBvbGRfY29tbTtcbiAgICAgICAgb2xkX2NvbW0gPSB1bmRlZmluZWQ7XG4gICAgfTtcbiAgICBpZiAoaXNFbmFibGVkKSB7XG4gICAgICAgIGFjdGl2YXRlKCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIG9wZW5DaGFubmVsOiBvcGVuQ29tbUlmcmFtZSxcbiAgICAgICAgY2xvc2VDaGFubmVsOiBkZXN0cm95Q29tbUlmcmFtZSxcbiAgICAgICAgaXNFbmFibGVkOiBpc0VuYWJsZWRcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImNvb2tpZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgZ2V0UmVjZWl2ZUNvb2tpZXNNZXNzYWdlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS50eXBlICE9PSBcIlRoaXJkUGFydHlDb29raWVzXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcC5jb29raWVzLlRISVJEX1BBUlRZX0NPT0tJRVMgPSAhIWRhdGEucGF5bG9hZDtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAmJiB0eXBlb2YgY2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCEhZGF0YS5wYXlsb2FkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXI7XG4gICAgfTtcbiAgICB2YXIgY2hlY2tUaGlyZFBhcnR5ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBnZXRSZWNlaXZlQ29va2llc01lc3NhZ2UoY2FsbGJhY2spO1xuICAgICAgICBmcC5oYW5kbGVycy5hdHRhY2goXCJjb29raWVzXCIsIGhhbmRsZXIpO1xuICAgICAgICBmcC5jb21tLm9wZW5DaGFubmVsKCk7XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBjaGVja1RoaXJkUGFydHk6IGNoZWNrVGhpcmRQYXJ0eVxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwiaGFuZGxlcnNcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgc3RvcmFnZSA9IHt9O1xuICAgIHZhciBhdHRhY2hIYW5kbGVyID0gZnVuY3Rpb24oaWQsIGhhbmRsZXIpIHtcbiAgICAgICAgaWYgKHN0b3JhZ2UuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICBzdG9yYWdlW2lkXS5wdXNoKGhhbmRsZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RvcmFnZVtpZF0gPSBbIGhhbmRsZXIgXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICB9O1xuICAgIHZhciBkZXRhY2hIYW5kbGVyID0gZnVuY3Rpb24oaWQsIGZuKSB7XG4gICAgICAgIHZhciBoYW5kbGVycyA9IHN0b3JhZ2VbaWRdO1xuICAgICAgICBpZiAoIWhhbmRsZXJzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhbmRsZXJzW2ldID09PSBmbikge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgc3RvcmFnZVtpZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgc3RvcmFnZVtpZF07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBydW4gPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHZhciBjYWxsZXJJZCA9IGRhdGEuaWQ7XG4gICAgICAgIGlmIChzdG9yYWdlLmhhc093blByb3BlcnR5KGNhbGxlcklkKSkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZXJzID0gc3RvcmFnZVtjYWxsZXJJZF07XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlcnNbaV0oZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBhdHRhY2g6IGF0dGFjaEhhbmRsZXIsXG4gICAgICAgIGRldGFjaDogZGV0YWNoSGFuZGxlcixcbiAgICAgICAgcnVuOiBydW5cbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImV4cG9ydGVyXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIG5vcm1hbGl6ZU9wdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBub3JtYWxpemUgPSBmdW5jdGlvbihzaW5ndWxhciwgcGx1cmFsLCBkZWYpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zW3BsdXJhbF0gJiYgIWZwLnV0aWwuaXNBcnJheShvcHRpb25zW3BsdXJhbF0pKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uc1twbHVyYWxdID0gWyBvcHRpb25zW3BsdXJhbF0gXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9uc1tzaW5ndWxhcl0pIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zW3BsdXJhbF0gPSBbIG9wdGlvbnNbc2luZ3VsYXJdIF07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRlZikge1xuICAgICAgICAgICAgICAgIG9wdGlvbnNbcGx1cmFsXSA9IGRlZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKG9wdGlvbnMubWltZXR5cGUgJiYgb3B0aW9ucy5leHRlbnNpb24pIHtcbiAgICAgICAgICAgIHRocm93IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJFcnJvcjogQ2Fubm90IHBhc3MgaW4gYm90aCBtaW1ldHlwZSBhbmQgZXh0ZW5zaW9uIHBhcmFtZXRlcnMgdG8gdGhlIGV4cG9ydCBmdW5jdGlvblwiKTtcbiAgICAgICAgfVxuICAgICAgICBub3JtYWxpemUoXCJzZXJ2aWNlXCIsIFwic2VydmljZXNcIik7XG4gICAgICAgIGlmIChvcHRpb25zLnNlcnZpY2VzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9wdGlvbnMuc2VydmljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VydmljZSA9IChcIlwiICsgb3B0aW9ucy5zZXJ2aWNlc1tpXSkucmVwbGFjZShcIiBcIiwgXCJcIik7XG4gICAgICAgICAgICAgICAgdmFyIHNpZCA9IGZwLnNlcnZpY2VzW3NlcnZpY2VdO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuc2VydmljZXNbaV0gPSBzaWQgPT09IHVuZGVmaW5lZCA/IHNlcnZpY2UgOiBzaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMub3BlblRvKSB7XG4gICAgICAgICAgICBvcHRpb25zLm9wZW5UbyA9IGZwLnNlcnZpY2VzW29wdGlvbnMub3BlblRvXSB8fCBvcHRpb25zLm9wZW5UbztcbiAgICAgICAgfVxuICAgICAgICBmcC51dGlsLnNldERlZmF1bHQob3B0aW9ucywgXCJjb250YWluZXJcIiwgZnAuYnJvd3Nlci5vcGVuSW5Nb2RhbCgpID8gXCJtb2RhbFwiIDogXCJ3aW5kb3dcIik7XG4gICAgfTtcbiAgICB2YXIgZ2V0RXhwb3J0SGFuZGxlciA9IGZ1bmN0aW9uKG9uU3VjY2Vzcywgb25FcnJvcikge1xuICAgICAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhLnR5cGUgIT09IFwiZmlsZXBpY2tlclVybFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBmcC51dGlsLmNvbnNvbGUuZXJyb3IoZGF0YS5lcnJvcik7XG4gICAgICAgICAgICAgICAgb25FcnJvcihmcC5lcnJvcnMuRlBFcnJvcigxMzIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGZwZmlsZSA9IHt9O1xuICAgICAgICAgICAgICAgIGZwZmlsZS51cmwgPSBkYXRhLnBheWxvYWQudXJsO1xuICAgICAgICAgICAgICAgIGZwZmlsZS5maWxlbmFtZSA9IGRhdGEucGF5bG9hZC5kYXRhLmZpbGVuYW1lO1xuICAgICAgICAgICAgICAgIGZwZmlsZS5taW1ldHlwZSA9IGRhdGEucGF5bG9hZC5kYXRhLnR5cGU7XG4gICAgICAgICAgICAgICAgZnBmaWxlLnNpemUgPSBkYXRhLnBheWxvYWQuZGF0YS5zaXplO1xuICAgICAgICAgICAgICAgIGZwZmlsZS5jbGllbnQgPSBkYXRhLnBheWxvYWQuZGF0YS5jbGllbnQ7XG4gICAgICAgICAgICAgICAgZnBmaWxlLmlzV3JpdGVhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZnBmaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZwLm1vZGFsLmNsb3NlKCk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgIH07XG4gICAgdmFyIGNyZWF0ZUV4cG9ydGVyID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvcikge1xuICAgICAgICBub3JtYWxpemVPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICB2YXIgYXBpID0ge1xuICAgICAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGZwLm1vZGFsLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChvcHRpb25zLmRlYnVnKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIG9uU3VjY2Vzcyh7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAxLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly93d3cuZmlsZXBpY2tlci5pby9hcGkvZmlsZS8tbkJxMm9uVFNlbUxCeGxjQlduMVwiLFxuICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZTogXCJ0ZXN0LnBuZ1wiLFxuICAgICAgICAgICAgICAgICAgICBtaW1ldHlwZTogXCJpbWFnZS9wbmdcIixcbiAgICAgICAgICAgICAgICAgICAgc2l6ZTogNTg5NzksXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudDogXCJjb21wdXRlclwiXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgIHJldHVybiBhcGk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZwLmNvb2tpZXMuVEhJUkRfUEFSVFlfQ09PS0lFUyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgYWxyZWFkeUhhbmRsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGZwLmNvb2tpZXMuY2hlY2tUaGlyZFBhcnR5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghYWxyZWFkeUhhbmRsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlRXhwb3J0ZXIoaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGFscmVhZHlIYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBhcGk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gZnAudXRpbC5nZXRJZCgpO1xuICAgICAgICB2YXIgZmluaXNoZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIG9uU3VjY2Vzc01hcmsgPSBmdW5jdGlvbihmcGZpbGUpIHtcbiAgICAgICAgICAgIGZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIG9uU3VjY2VzcyhmcGZpbGUpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgb25FcnJvck1hcmsgPSBmdW5jdGlvbihmcGVycm9yKSB7XG4gICAgICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG4gICAgICAgICAgICBvbkVycm9yKGZwZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgb25DbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCFmaW5pc2hlZCkge1xuICAgICAgICAgICAgICAgIGZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBvbkVycm9yKGZwLmVycm9ycy5GUEVycm9yKDEzMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBmcC53aW5kb3cub3BlbihvcHRpb25zLmNvbnRhaW5lciwgZnAudXJscy5jb25zdHJ1Y3RFeHBvcnRVcmwoaW5wdXQsIG9wdGlvbnMsIGlkKSwgb25DbG9zZSk7XG4gICAgICAgIGZwLmhhbmRsZXJzLmF0dGFjaChpZCwgZ2V0RXhwb3J0SGFuZGxlcihvblN1Y2Nlc3NNYXJrLCBvbkVycm9yTWFyaykpO1xuICAgICAgICByZXR1cm4gYXBpO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY3JlYXRlRXhwb3J0ZXI6IGNyZWF0ZUV4cG9ydGVyXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJtb2RhbFwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzLCBTSEFERV9OQU1FID0gXCJmaWxlcGlja2VyX3NoYWRlXCIsIFdJTkRPV19DT05UQUlORVJfTkFNRSA9IFwiZmlsZXBpY2tlcl9kaWFsb2dfY29udGFpbmVyXCI7XG4gICAgdmFyIG9yaWdpbmFsQm9keSA9IGdldEh0bWxUYWcoKTtcbiAgICBpZiAob3JpZ2luYWxCb2R5KSB7XG4gICAgICAgIHZhciBvcmlnaW5hbE92ZXJmbG93ID0gb3JpZ2luYWxCb2R5LnN0eWxlLm92ZXJmbG93O1xuICAgIH1cbiAgICB2YXIgZ2VuZXJhdGVNb2RhbCA9IGZ1bmN0aW9uKG1vZGFsVXJsLCBvbkNsb3NlKSB7XG4gICAgICAgIGFwcGVuZFN0eWxlKCk7XG4gICAgICAgIHZhciBzaGFkZSA9IGNyZWF0ZU1vZGFsU2hhZGUob25DbG9zZSksIGNvbnRhaW5lciA9IGNyZWF0ZU1vZGFsQ29udGFpbmVyKCksIGNsb3NlID0gY3JlYXRlTW9kYWxDbG9zZShvbkNsb3NlKSwgbW9kYWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO1xuICAgICAgICBtb2RhbC5uYW1lID0gZnAud2luZG93LldJTkRPV19OQU1FO1xuICAgICAgICBtb2RhbC5pZCA9IGZwLndpbmRvdy5XSU5ET1dfTkFNRTtcbiAgICAgICAgbW9kYWwuc3R5bGUud2lkdGggPSBcIjEwMCVcIjtcbiAgICAgICAgbW9kYWwuc3R5bGUuaGVpZ2h0ID0gXCIxMDAlXCI7XG4gICAgICAgIG1vZGFsLnN0eWxlLmJvcmRlciA9IFwibm9uZVwiO1xuICAgICAgICBtb2RhbC5zdHlsZS5wb3NpdGlvbiA9IFwicmVsYXRpdmVcIjtcbiAgICAgICAgbW9kYWwuc2V0QXR0cmlidXRlKFwiYm9yZGVyXCIsIDApO1xuICAgICAgICBtb2RhbC5zZXRBdHRyaWJ1dGUoXCJmcmFtZWJvcmRlclwiLCAwKTtcbiAgICAgICAgbW9kYWwuc2V0QXR0cmlidXRlKFwiZnJhbWVCb3JkZXJcIiwgMCk7XG4gICAgICAgIG1vZGFsLnNldEF0dHJpYnV0ZShcIm1hcmdpbndpZHRoXCIsIDApO1xuICAgICAgICBtb2RhbC5zZXRBdHRyaWJ1dGUoXCJtYXJnaW5oZWlnaHRcIiwgMCk7XG4gICAgICAgIG1vZGFsLnNyYyA9IG1vZGFsVXJsO1xuICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobW9kYWwpO1xuICAgICAgICBzaGFkZS5hcHBlbmRDaGlsZChjbG9zZSk7XG4gICAgICAgIHNoYWRlLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2hhZGUpO1xuICAgICAgICB2YXIgYm9keSA9IGdldEh0bWxUYWcoKTtcbiAgICAgICAgaWYgKGJvZHkpIHtcbiAgICAgICAgICAgIGJvZHkuc3R5bGUub3ZlcmZsb3cgPSBcImhpZGRlblwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtb2RhbDtcbiAgICB9O1xuICAgIHZhciBjcmVhdGVNb2RhbFNoYWRlID0gZnVuY3Rpb24ob25DbG9zZSkge1xuICAgICAgICB2YXIgc2hhZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBzaGFkZS5pZCA9IFNIQURFX05BTUU7XG4gICAgICAgIHNoYWRlLmNsYXNzTmFtZSA9IFwiZnBfX292ZXJsYXlcIjtcbiAgICAgICAgc2hhZGUub25jbGljayA9IGdldENsb3NlTW9kYWwob25DbG9zZSk7XG4gICAgICAgIHJldHVybiBzaGFkZTtcbiAgICB9O1xuICAgIHZhciBjcmVhdGVNb2RhbENvbnRhaW5lciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbW9kYWxjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBtb2RhbGNvbnRhaW5lci5pZCA9IFdJTkRPV19DT05UQUlORVJfTkFNRTtcbiAgICAgICAgbW9kYWxjb250YWluZXIuY2xhc3NOYW1lID0gXCJmcF9fY29udGFpbmVyXCI7XG4gICAgICAgIHJldHVybiBtb2RhbGNvbnRhaW5lcjtcbiAgICB9O1xuICAgIHZhciBjcmVhdGVNb2RhbENsb3NlID0gZnVuY3Rpb24ob25DbG9zZSkge1xuICAgICAgICB2YXIgY2xvc2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBjbG9zZS5jbGFzc05hbWUgPSBcImZwX19jbG9zZVwiO1xuICAgICAgICB2YXIgY2xvc2VBbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtcbiAgICAgICAgY2xvc2VBbmNob3IuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJYXCIpKTtcbiAgICAgICAgY2xvc2UuYXBwZW5kQ2hpbGQoY2xvc2VBbmNob3IpO1xuICAgICAgICBjbG9zZUFuY2hvci5vbmNsaWNrID0gZ2V0Q2xvc2VNb2RhbChvbkNsb3NlKTtcbiAgICAgICAgZG9jdW1lbnQub25rZXlkb3duID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBldnQgPSBldnQgfHwgd2luZG93LmV2ZW50O1xuICAgICAgICAgICAgaWYgKGV2dC5rZXlDb2RlID09PSAyNykge1xuICAgICAgICAgICAgICAgIGdldENsb3NlTW9kYWwob25DbG9zZSkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGNsb3NlO1xuICAgIH07XG4gICAgdmFyIGdldENsb3NlTW9kYWwgPSBmdW5jdGlvbihvbkNsb3NlLCBmb3JjZSkge1xuICAgICAgICBmb3JjZSA9ICEhZm9yY2U7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChmcC51cGxvYWRpbmcgJiYgIWZvcmNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3aW5kb3cuY29uZmlybSgnWW91IGFyZSBjdXJyZW50bHkgdXBsb2FkaW5nLiBJZiB5b3UgY2hvb3NlIFwiT0tcIiwgdGhlIHdpbmRvdyB3aWxsIGNsb3NlIGFuZCB5b3VyIHVwbG9hZCB3aWxsIG5vdCBmaW5pc2guIERvIHlvdSB3YW50IHRvIHN0b3AgdXBsb2FkaW5nIGFuZCBjbG9zZSB0aGUgd2luZG93PycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcC51cGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGRvY3VtZW50Lm9ua2V5ZG93biA9IG51bGw7XG4gICAgICAgICAgICBzZXRPcmlnaW5hbE92ZXJmbG93KCk7XG4gICAgICAgICAgICB2YXIgc2hhZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTSEFERV9OQU1FKTtcbiAgICAgICAgICAgIGlmIChzaGFkZSkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoc2hhZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFdJTkRPV19DT05UQUlORVJfTkFNRSk7XG4gICAgICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChjb250YWluZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBkZWxldGUgd2luZG93LmZyYW1lc1tmcC53aW5kb3cuV0lORE9XX05BTUVdO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgIGlmIChvbkNsb3NlKSB7XG4gICAgICAgICAgICAgICAgb25DbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG4gICAgZnVuY3Rpb24gaGlkZSgpIHtcbiAgICAgICAgdmFyIHNoYWRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU0hBREVfTkFNRSk7XG4gICAgICAgIGlmIChzaGFkZSkge1xuICAgICAgICAgICAgc2hhZGUuaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoV0lORE9XX0NPTlRBSU5FUl9OQU1FKTtcbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgY29udGFpbmVyLmhpZGRlbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgc2V0T3JpZ2luYWxPdmVyZmxvdygpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRPcmlnaW5hbE92ZXJmbG93KCkge1xuICAgICAgICB2YXIgYm9keSA9IGdldEh0bWxUYWcoKTtcbiAgICAgICAgaWYgKGJvZHkpIHtcbiAgICAgICAgICAgIGJvZHkuc3R5bGUub3ZlcmZsb3cgPSBvcmlnaW5hbE92ZXJmbG93O1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGFwcGVuZFN0eWxlKCkge1xuICAgICAgICB2YXIgY3NzID0gXCIuZnBfX292ZXJsYXkge3RvcDogMDtyaWdodDogMDtib3R0b206IDA7bGVmdDogMDt6LWluZGV4OiAxMDAwO2JhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC44KTt9XCIgKyBcIi5mcF9fY2xvc2Uge3RvcDogMTA0cHg7IHJpZ2h0OiAxMDhweDsgd2lkdGg6IDM1cHg7IGhlaWdodDogMzVweDsgei1pbmRleDogMjA7IGN1cnNvcjogcG9pbnRlcn1cIiArIFwiQG1lZGlhIHNjcmVlbiBhbmQgKG1heC13aWR0aDogNzY4cHgpLCBzY3JlZW4gYW5kIChtYXgtaGVpZ2h0OiA1MDBweCkgey5mcF9fY2xvc2Uge3RvcDogMTVweDsgcmlnaHQ6IDEycHg7fX1cIiArIFwiLmZwX19jbG9zZSBhIHt0ZXh0LWluZGVudDogLTk5OTlweDsgb3ZlcmZsb3c6IGhpZGRlbjsgZGlzcGxheTogYmxvY2s7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6IHVybChodHRwczovL2QxenloM3NieGl0dHZnLmNsb3VkZnJvbnQubmV0L2Nsb3NlLnBuZykgNTAlIDUwJSBuby1yZXBlYXQ7fVwiICsgXCIuZnBfX2Nsb3NlIGE6aG92ZXIge2JhY2tncm91bmQtY29sb3I6IHJnYmEoMCwwLDAsIC4wMik7IG9wYWNpdHk6IC44O31cIiArIFwiQG1lZGlhIHNjcmVlbiBhbmQgKG1heC13aWR0aDogNzY4cHgpLCBzY3JlZW4gYW5kIChtYXgtaGVpZ2h0OiA1MDBweCkge3RvcDogMTRweDsgcmlnaHQ6IDE0cHg7fVwiICsgXCIuZnBfX2NvcHkge2Rpc3BsYXk6IG5vbmU7fVwiICsgXCIuZnBfX2NvbnRhaW5lciB7LXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6IHRvdWNoOyBvdmVyZmxvdzogaGlkZGVuOyBtaW4taGVpZ2h0OiAzMDBweDsgdG9wOiAxMDBweDtyaWdodDogMTAwcHg7Ym90dG9tOiAxMDBweDtsZWZ0OiAxMDBweDtiYWNrZ3JvdW5kOiAjZWVlOyBib3gtc2l6aW5nOmNvbnRlbnQtYm94OyAtd2Via2l0LWJveC1zaXppbmc6Y29udGVudC1ib3g7IC1tb3otYm94LXNpemluZzpjb250ZW50LWJveDt9XCIgKyBcIkBtZWRpYSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDc2OHB4KSwgc2NyZWVuIGFuZCAobWF4LWhlaWdodDogNTAwcHgpIHsuZnBfX2NvcHkge2JvdHRvbTogMDsgbGVmdDogMDsgcmlnaHQ6IDA7IGhlaWdodDogMjBweDsgYmFja2dyb3VuZDogIzMzMzt9fVwiICsgXCJAbWVkaWEgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA3NjhweCksIHNjcmVlbiBhbmQgKG1heC1oZWlnaHQ6IDUwMHB4KSB7LmZwX19jb3B5IGEge21hcmdpbi1sZWZ0OiA1cHg7fX1cIiArIFwiQG1lZGlhIHNjcmVlbiBhbmQgKG1heC13aWR0aDogNzY4cHgpLCBzY3JlZW4gYW5kIChtYXgtaGVpZ2h0OiA1MDBweCkgey5mcF9fY29udGFpbmVyIHt0b3A6IDA7cmlnaHQ6IDA7Ym90dG9tOiAwO2xlZnQ6IDA7fX1cIiArIFwiLmZwX19vdmVybGF5LCAuZnBfX2Nsb3NlLCAuZnBfX2NvcHksIC5mcF9fY29udGFpbmVyIHtwb3NpdGlvbjogZml4ZWQ7fVwiO1xuICAgICAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdLCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgc3R5bGUudHlwZSA9IFwidGV4dC9jc3NcIjtcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICAgICAgICB9XG4gICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRIdG1sVGFnKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaHRtbFwiKVswXTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgY2xvc2VNb2RhbCA9IGdldENsb3NlTW9kYWwoZnVuY3Rpb24oKSB7fSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2VuZXJhdGU6IGdlbmVyYXRlTW9kYWwsXG4gICAgICAgIGNsb3NlOiBjbG9zZU1vZGFsLFxuICAgICAgICBoaWRlOiBoaWRlXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJwaWNrZXJcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgbm9ybWFsaXplT3B0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHNpbmd1bGFyLCBwbHVyYWwsIGRlZikge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnNbcGx1cmFsXSkge1xuICAgICAgICAgICAgICAgIGlmICghZnAudXRpbC5pc0FycmF5KG9wdGlvbnNbcGx1cmFsXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uc1twbHVyYWxdID0gWyBvcHRpb25zW3BsdXJhbF0gXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnNbc2luZ3VsYXJdKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uc1twbHVyYWxdID0gWyBvcHRpb25zW3Npbmd1bGFyXSBdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkZWYpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zW3BsdXJhbF0gPSBkZWY7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIG5vcm1hbGl6ZShcInNlcnZpY2VcIiwgXCJzZXJ2aWNlc1wiKTtcbiAgICAgICAgbm9ybWFsaXplKFwibWltZXR5cGVcIiwgXCJtaW1ldHlwZXNcIik7XG4gICAgICAgIG5vcm1hbGl6ZShcImV4dGVuc2lvblwiLCBcImV4dGVuc2lvbnNcIik7XG4gICAgICAgIGlmIChvcHRpb25zLnNlcnZpY2VzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9wdGlvbnMuc2VydmljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VydmljZSA9IChcIlwiICsgb3B0aW9ucy5zZXJ2aWNlc1tpXSkucmVwbGFjZShcIiBcIiwgXCJcIik7XG4gICAgICAgICAgICAgICAgaWYgKGZwLnNlcnZpY2VzW3NlcnZpY2VdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VydmljZSA9IGZwLnNlcnZpY2VzW3NlcnZpY2VdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvcHRpb25zLnNlcnZpY2VzW2ldID0gc2VydmljZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5taW1ldHlwZXMgJiYgb3B0aW9ucy5leHRlbnNpb25zKSB7XG4gICAgICAgICAgICB0aHJvdyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiRXJyb3I6IENhbm5vdCBwYXNzIGluIGJvdGggbWltZXR5cGUgYW5kIGV4dGVuc2lvbiBwYXJhbWV0ZXJzIHRvIHRoZSBwaWNrIGZ1bmN0aW9uXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghb3B0aW9ucy5taW1ldHlwZXMgJiYgIW9wdGlvbnMuZXh0ZW5zaW9ucykge1xuICAgICAgICAgICAgb3B0aW9ucy5taW1ldHlwZXMgPSBbIFwiKi8qXCIgXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5vcGVuVG8pIHtcbiAgICAgICAgICAgIG9wdGlvbnMub3BlblRvID0gZnAuc2VydmljZXNbb3B0aW9ucy5vcGVuVG9dIHx8IG9wdGlvbnMub3BlblRvO1xuICAgICAgICB9XG4gICAgICAgIGZwLnV0aWwuc2V0RGVmYXVsdChvcHRpb25zLCBcImNvbnRhaW5lclwiLCBmcC5icm93c2VyLm9wZW5Jbk1vZGFsKCkgPyBcIm1vZGFsXCIgOiBcIndpbmRvd1wiKTtcbiAgICB9O1xuICAgIHZhciBnZXRQaWNrSGFuZGxlciA9IGZ1bmN0aW9uKG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJEYXRhVHlwZShkYXRhLCBvblByb2dyZXNzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZwLnVwbG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKGRhdGEuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBmcC51dGlsLmNvbnNvbGUuZXJyb3IoZGF0YS5lcnJvcik7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZXJyb3IuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKGZwLmVycm9ycy5GUEVycm9yKGRhdGEuZXJyb3IuY29kZSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IoZnAuZXJyb3JzLkZQRXJyb3IoMTAyKSk7XG4gICAgICAgICAgICAgICAgICAgIGZwLm1vZGFsLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgZnBmaWxlID0gZnBmaWxlRnJvbVBheWxvYWQoZGF0YS5wYXlsb2FkKTtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZnBmaWxlKTtcbiAgICAgICAgICAgICAgICBmcC5tb2RhbC5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICB9O1xuICAgIHZhciBnZXRQaWNrRm9sZGVySGFuZGxlciA9IGZ1bmN0aW9uKG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJEYXRhVHlwZShkYXRhLCBvblByb2dyZXNzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZwLnVwbG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKGRhdGEuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBmcC51dGlsLmNvbnNvbGUuZXJyb3IoZGF0YS5lcnJvcik7XG4gICAgICAgICAgICAgICAgb25FcnJvcihmcC5lcnJvcnMuRlBFcnJvcigxMDIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YS5wYXlsb2FkLmRhdGEudXJsID0gZGF0YS5wYXlsb2FkLnVybDtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZGF0YS5wYXlsb2FkLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnAubW9kYWwuY2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXI7XG4gICAgfTtcbiAgICB2YXIgZ2V0VXBsb2FkaW5nSGFuZGxlciA9IGZ1bmN0aW9uKG9uVXBsb2FkaW5nKSB7XG4gICAgICAgIG9uVXBsb2FkaW5nID0gb25VcGxvYWRpbmcgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS50eXBlICE9PSBcInVwbG9hZGluZ1wiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnAudXBsb2FkaW5nID0gISFkYXRhLnBheWxvYWQ7XG4gICAgICAgICAgICBvblVwbG9hZGluZyhmcC51cGxvYWRpbmcpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICB9O1xuICAgIHZhciBhZGRJZkV4aXN0ID0gZnVuY3Rpb24oZGF0YSwgZnBmaWxlLCBrZXkpIHtcbiAgICAgICAgaWYgKGRhdGFba2V5XSkge1xuICAgICAgICAgICAgZnBmaWxlW2tleV0gPSBkYXRhW2tleV07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBmcGZpbGVGcm9tUGF5bG9hZCA9IGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAgICAgICAgdmFyIGZwZmlsZSA9IHt9O1xuICAgICAgICB2YXIgdXJsID0gcGF5bG9hZC51cmw7XG4gICAgICAgIGlmICh1cmwgJiYgdXJsLnVybCkge1xuICAgICAgICAgICAgdXJsID0gdXJsLnVybDtcbiAgICAgICAgfVxuICAgICAgICBmcGZpbGUudXJsID0gdXJsO1xuICAgICAgICB2YXIgZGF0YSA9IHBheWxvYWQudXJsLmRhdGEgfHwgcGF5bG9hZC5kYXRhO1xuICAgICAgICBmcGZpbGUuZmlsZW5hbWUgPSBkYXRhLmZpbGVuYW1lO1xuICAgICAgICBmcGZpbGUubWltZXR5cGUgPSBkYXRhLnR5cGU7XG4gICAgICAgIGZwZmlsZS5zaXplID0gZGF0YS5zaXplO1xuICAgICAgICBpZiAoZGF0YS5jcm9wcGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGZwZmlsZS5jcm9wcGVkID0gZGF0YS5jcm9wcGVkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLnJvdGF0ZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZnBmaWxlLnJvdGF0ZWQgPSBkYXRhLnJvdGF0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuY29udmVydGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGZwZmlsZS5jb252ZXJ0ZWQgPSBkYXRhLmNvbnZlcnRlZDtcbiAgICAgICAgfVxuICAgICAgICBhZGRJZkV4aXN0KGRhdGEsIGZwZmlsZSwgXCJpZFwiKTtcbiAgICAgICAgYWRkSWZFeGlzdChkYXRhLCBmcGZpbGUsIFwia2V5XCIpO1xuICAgICAgICBhZGRJZkV4aXN0KGRhdGEsIGZwZmlsZSwgXCJjb250YWluZXJcIik7XG4gICAgICAgIGFkZElmRXhpc3QoZGF0YSwgZnBmaWxlLCBcInBhdGhcIik7XG4gICAgICAgIGFkZElmRXhpc3QoZGF0YSwgZnBmaWxlLCBcImNsaWVudFwiKTtcbiAgICAgICAgZnBmaWxlLmlzV3JpdGVhYmxlID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGZwZmlsZTtcbiAgICB9O1xuICAgIHZhciBnZXRQaWNrTXVsdGlwbGVIYW5kbGVyID0gZnVuY3Rpb24ob25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgaWYgKGZpbHRlckRhdGFUeXBlKGRhdGEsIG9uUHJvZ3Jlc3MpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnAudXBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICAgICAgICAgIGZwLnV0aWwuY29uc29sZS5lcnJvcihkYXRhLmVycm9yKTtcbiAgICAgICAgICAgICAgICBvbkVycm9yKGZwLmVycm9ycy5GUEVycm9yKDEwMikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgZnBmaWxlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmICghZnAudXRpbC5pc0FycmF5KGRhdGEucGF5bG9hZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wYXlsb2FkID0gWyBkYXRhLnBheWxvYWQgXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLnBheWxvYWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZwZmlsZSA9IGZwZmlsZUZyb21QYXlsb2FkKGRhdGEucGF5bG9hZFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIGZwZmlsZXMucHVzaChmcGZpbGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZnBmaWxlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcC5tb2RhbC5jbG9zZSgpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICB9O1xuICAgIHZhciBjcmVhdGVQaWNrZXIgPSBmdW5jdGlvbihvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG11bHRpcGxlLCBmb2xkZXIsIG9uUHJvZ3Jlc3MsIGNvbnZlcnRGaWxlKSB7XG4gICAgICAgIG5vcm1hbGl6ZU9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIHZhciBhcGkgPSB7XG4gICAgICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgZnAubW9kYWwuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKG9wdGlvbnMuZGVidWcpIHtcbiAgICAgICAgICAgIHZhciBkdW15X2RhdGEgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IDEsXG4gICAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vd3d3LmZpbGVwaWNrZXIuaW8vYXBpL2ZpbGUvLW5CcTJvblRTZW1MQnhsY0JXbjFcIixcbiAgICAgICAgICAgICAgICBmaWxlbmFtZTogXCJ0ZXN0LnBuZ1wiLFxuICAgICAgICAgICAgICAgIG1pbWV0eXBlOiBcImltYWdlL3BuZ1wiLFxuICAgICAgICAgICAgICAgIHNpemU6IDU4OTc5LFxuICAgICAgICAgICAgICAgIGNsaWVudDogXCJjb21wdXRlclwiXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGR1bXlfY2FsbGJhY2s7XG4gICAgICAgICAgICBpZiAobXVsdGlwbGUgfHwgb3B0aW9ucy5zdG9yZUxvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgZHVteV9jYWxsYmFjayA9IFsgZHVteV9kYXRhLCBkdW15X2RhdGEsIGR1bXlfZGF0YSBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkdW15X2NhbGxiYWNrID0gZHVteV9kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZHVteV9jYWxsYmFjayk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgIHJldHVybiBhcGk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZwLmNvb2tpZXMuVEhJUkRfUEFSVFlfQ09PS0lFUyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgYWxyZWFkeUhhbmRsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGZwLmNvb2tpZXMuY2hlY2tUaGlyZFBhcnR5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghYWxyZWFkeUhhbmRsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlUGlja2VyKG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgISFtdWx0aXBsZSwgZm9sZGVyLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICAgICAgYWxyZWFkeUhhbmRsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGFwaTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWQgPSBmcC51dGlsLmdldElkKCk7XG4gICAgICAgIHZhciBmaW5pc2hlZCA9IGZhbHNlO1xuICAgICAgICB2YXIgb25TdWNjZXNzTWFyayA9IGZ1bmN0aW9uKGZwZmlsZSkge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuY29udGFpbmVyID09PSBcIndpbmRvd1wiKSB7XG4gICAgICAgICAgICAgICAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIG9uU3VjY2VzcyhmcGZpbGUpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgb25FcnJvck1hcmsgPSBmdW5jdGlvbihmcGVycm9yKSB7XG4gICAgICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG4gICAgICAgICAgICBvbkVycm9yKGZwZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgb25DbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCFmaW5pc2hlZCkge1xuICAgICAgICAgICAgICAgIGZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBvbkVycm9yKGZwLmVycm9ycy5GUEVycm9yKDEwMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB2YXIgdXJsO1xuICAgICAgICB2YXIgaGFuZGxlcjtcbiAgICAgICAgaWYgKGNvbnZlcnRGaWxlKSB7XG4gICAgICAgICAgICB1cmwgPSBmcC51cmxzLmNvbnN0cnVjdENvbnZlcnRVcmwob3B0aW9ucywgaWQpO1xuICAgICAgICAgICAgaGFuZGxlciA9IGdldFBpY2tIYW5kbGVyKG9uU3VjY2Vzc01hcmssIG9uRXJyb3JNYXJrLCBvblByb2dyZXNzKTtcbiAgICAgICAgfSBlbHNlIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgdXJsID0gZnAudXJscy5jb25zdHJ1Y3RQaWNrVXJsKG9wdGlvbnMsIGlkLCB0cnVlKTtcbiAgICAgICAgICAgIGhhbmRsZXIgPSBnZXRQaWNrTXVsdGlwbGVIYW5kbGVyKG9uU3VjY2Vzc01hcmssIG9uRXJyb3JNYXJrLCBvblByb2dyZXNzKTtcbiAgICAgICAgfSBlbHNlIGlmIChmb2xkZXIpIHtcbiAgICAgICAgICAgIHVybCA9IGZwLnVybHMuY29uc3RydWN0UGlja0ZvbGRlclVybChvcHRpb25zLCBpZCk7XG4gICAgICAgICAgICBoYW5kbGVyID0gZ2V0UGlja0ZvbGRlckhhbmRsZXIob25TdWNjZXNzTWFyaywgb25FcnJvck1hcmssIG9uUHJvZ3Jlc3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdXJsID0gZnAudXJscy5jb25zdHJ1Y3RQaWNrVXJsKG9wdGlvbnMsIGlkLCBmYWxzZSk7XG4gICAgICAgICAgICBoYW5kbGVyID0gZ2V0UGlja0hhbmRsZXIob25TdWNjZXNzTWFyaywgb25FcnJvck1hcmssIG9uUHJvZ3Jlc3MpO1xuICAgICAgICB9XG4gICAgICAgIGZwLndpbmRvdy5vcGVuKG9wdGlvbnMuY29udGFpbmVyLCB1cmwsIG9uQ2xvc2UpO1xuICAgICAgICBmcC5oYW5kbGVycy5hdHRhY2goaWQsIGhhbmRsZXIpO1xuICAgICAgICB2YXIga2V5ID0gaWQgKyBcIi11cGxvYWRcIjtcbiAgICAgICAgZnAuaGFuZGxlcnMuYXR0YWNoKGtleSwgZ2V0VXBsb2FkaW5nSGFuZGxlcihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZwLmhhbmRsZXJzLmRldGFjaChrZXkpO1xuICAgICAgICB9KSk7XG4gICAgICAgIHJldHVybiBhcGk7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBmaWx0ZXJEYXRhVHlwZShkYXRhLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGlmIChkYXRhLnR5cGUgPT09IFwiZmlsZXBpY2tlclByb2dyZXNzXCIpIHtcbiAgICAgICAgICAgIGZwLnVwbG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICBpZiAob25Qcm9ncmVzcykge1xuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MoZGF0YS5wYXlsb2FkLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGRhdGEudHlwZSA9PT0gXCJub3RVcGxvYWRpbmdcIikge1xuICAgICAgICAgICAgZnAudXBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS50eXBlID09PSBcImNsb3NlTW9kYWxcIikge1xuICAgICAgICAgICAgZnAubW9kYWwuY2xvc2UoKTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLnR5cGUgPT09IFwiaGlkZU1vZGFsXCIpIHtcbiAgICAgICAgICAgIGZwLm1vZGFsLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLnR5cGUgPT09IFwiZmlsZXBpY2tlclVybFwiIHx8IGRhdGEudHlwZSA9PT0gXCJzZXJ2ZXJIdHRwRXJyb3JcIikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBjcmVhdGVQaWNrZXI6IGNyZWF0ZVBpY2tlclxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwid2luZG93XCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIERJQUxPR19UWVBFUyA9IHtcbiAgICAgICAgT1BFTjogXCIvZGlhbG9nL29wZW4vXCIsXG4gICAgICAgIFNBVkVBUzogXCIvZGlhbG9nL3NhdmUvXCJcbiAgICB9O1xuICAgIHZhciBXSU5ET1dfTkFNRSA9IFwiZmlsZXBpY2tlcl9kaWFsb2dcIjtcbiAgICB2YXIgV0lORE9XX1BST1BFUlRJRVMgPSBcImxlZnQ9MTAwLHRvcD0xMDAsaGVpZ2h0PTYwMCx3aWR0aD04MDAsbWVudWJhcj1ubyx0b29sYmFyPW5vLGxvY2F0aW9uPW5vLHBlcnNvbmFsYmFyPW5vLHN0YXR1cz1ubyxyZXNpemFibGU9eWVzLHNjcm9sbGJhcnM9eWVzLGRlcGVuZGVudD15ZXMsZGlhbG9nPXllc1wiO1xuICAgIHZhciBDTE9TRV9DSEVDS19JTlRFUlZBTCA9IDEwMDtcbiAgICB2YXIgb3BlbldpbmRvdyA9IGZ1bmN0aW9uKGNvbnRhaW5lciwgc3JjLCBvbkNsb3NlKSB7XG4gICAgICAgIG9uQ2xvc2UgPSBvbkNsb3NlIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIGlmICghY29udGFpbmVyICYmIGZwLmJyb3dzZXIub3BlbkluTW9kYWwoKSkge1xuICAgICAgICAgICAgY29udGFpbmVyID0gXCJtb2RhbFwiO1xuICAgICAgICB9IGVsc2UgaWYgKCFjb250YWluZXIpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lciA9IFwid2luZG93XCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRhaW5lciA9PT0gXCJ3aW5kb3dcIikge1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBXSU5ET1dfTkFNRSArIGZwLnV0aWwuZ2V0SWQoKTtcbiAgICAgICAgICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uIGNvbmZpcm1FeGl0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIkZpbGVwaWNrZXIgdXBsb2FkIGRvZXMgbm90IGNvbXBsZXRlLlwiO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciB3aW4gPSB3aW5kb3cub3BlbihzcmMsIG5hbWUsIFdJTkRPV19QUk9QRVJUSUVTKTtcbiAgICAgICAgICAgIGlmICghd2luKSB7XG4gICAgICAgICAgICAgICAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gbnVsbDtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYWxlcnQoXCJQbGVhc2UgZGlzYWJsZSB5b3VyIHBvcHVwIGJsb2NrZXIgdG8gdXBsb2FkIGZpbGVzLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjbG9zZUNoZWNrID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghd2luIHx8IHdpbi5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwoY2xvc2VDaGVjayk7XG4gICAgICAgICAgICAgICAgICAgIG9uQ2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBDTE9TRV9DSEVDS19JTlRFUlZBTCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyID09PSBcIm1vZGFsXCIpIHtcbiAgICAgICAgICAgIGZwLm1vZGFsLmdlbmVyYXRlKHNyYywgb25DbG9zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyX2lmcmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbnRhaW5lcik7XG4gICAgICAgICAgICBpZiAoIWNvbnRhaW5lcl9pZnJhbWUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbignQ29udGFpbmVyIFwiJyArIGNvbnRhaW5lciArICdcIiBub3QgZm91bmQuIFRoaXMgc2hvdWxkIGVpdGhlciBiZSBzZXQgdG8gXCJ3aW5kb3dcIixcIm1vZGFsXCIsIG9yIHRoZSBJRCBvZiBhbiBpZnJhbWUgdGhhdCBpcyBjdXJyZW50bHkgaW4gdGhlIGRvY3VtZW50LicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGFpbmVyX2lmcmFtZS5zcmMgPSBzcmM7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIG9wZW46IG9wZW5XaW5kb3csXG4gICAgICAgIFdJTkRPV19OQU1FOiBXSU5ET1dfTkFNRVxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwiY29udmVyc2lvbnNcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgdmFsaWRfcGFyYW1ldGVycyA9IHtcbiAgICAgICAgYWxpZ246IFwic3RyaW5nXCIsXG4gICAgICAgIGJsdXJBbW91bnQ6IFwibnVtYmVyXCIsXG4gICAgICAgIGNyb3A6IFwic3RyaW5nIG9yIGFycmF5XCIsXG4gICAgICAgIGNyb3BfZmlyc3Q6IFwiYm9vbGVhblwiLFxuICAgICAgICBjb21wcmVzczogXCJib29sZWFuXCIsXG4gICAgICAgIGV4aWY6IFwic3RyaW5nIG9yIGJvb2xlYW5cIixcbiAgICAgICAgZmlsdGVyOiBcInN0cmluZ1wiLFxuICAgICAgICBmaXQ6IFwic3RyaW5nXCIsXG4gICAgICAgIGZvcm1hdDogXCJzdHJpbmdcIixcbiAgICAgICAgaGVpZ2h0OiBcIm51bWJlclwiLFxuICAgICAgICBwb2xpY3k6IFwic3RyaW5nXCIsXG4gICAgICAgIHF1YWxpdHk6IFwibnVtYmVyXCIsXG4gICAgICAgIHBhZ2U6IFwibnVtYmVyXCIsXG4gICAgICAgIHJvdGF0ZTogXCJzdHJpbmcgb3IgbnVtYmVyXCIsXG4gICAgICAgIHNlY3VyZTogXCJib29sZWFuXCIsXG4gICAgICAgIHNoYXJwZW5BbW91bnQ6IFwibnVtYmVyXCIsXG4gICAgICAgIHNpZ25hdHVyZTogXCJzdHJpbmdcIixcbiAgICAgICAgc3RvcmVBY2Nlc3M6IFwic3RyaW5nXCIsXG4gICAgICAgIHN0b3JlQ29udGFpbmVyOiBcInN0cmluZ1wiLFxuICAgICAgICBzdG9yZVJlZ2lvbjogXCJzdHJpbmdcIixcbiAgICAgICAgc3RvcmVMb2NhdGlvbjogXCJzdHJpbmdcIixcbiAgICAgICAgc3RvcmVQYXRoOiBcInN0cmluZ1wiLFxuICAgICAgICB0ZXh0OiBcInN0cmluZ1wiLFxuICAgICAgICB0ZXh0X2FsaWduOiBcInN0cmluZ1wiLFxuICAgICAgICB0ZXh0X2NvbG9yOiBcInN0cmluZ1wiLFxuICAgICAgICB0ZXh0X2ZvbnQ6IFwic3RyaW5nXCIsXG4gICAgICAgIHRleHRfcGFkZGluZzogXCJudW1iZXJcIixcbiAgICAgICAgdGV4dF9zaXplOiBcIm51bWJlclwiLFxuICAgICAgICB3YXRlcm1hcms6IFwic3RyaW5nXCIsXG4gICAgICAgIHdhdGVybWFya19wb3NpdGlvbjogXCJzdHJpbmdcIixcbiAgICAgICAgd2F0ZXJtYXJrX3NpemU6IFwibnVtYmVyXCIsXG4gICAgICAgIHdpZHRoOiBcIm51bWJlclwiXG4gICAgfTtcbiAgICB2YXIgcmVzdF9tYXAgPSB7XG4gICAgICAgIHc6IFwid2lkdGhcIixcbiAgICAgICAgaDogXCJoZWlnaHRcIlxuICAgIH07XG4gICAgdmFyIG1hcFJlc3RQYXJhbXMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIG9ialtyZXN0X21hcFtrZXldIHx8IGtleV0gPSBvcHRpb25zW2tleV07XG4gICAgICAgICAgICBpZiAodmFsaWRfcGFyYW1ldGVyc1tyZXN0X21hcFtrZXldIHx8IGtleV0gPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICBvYmpbcmVzdF9tYXBba2V5XSB8fCBrZXldID0gTnVtYmVyKG9wdGlvbnNba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIHZhciBjaGVja1BhcmFtZXRlcnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBmb3VuZDtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IgKHZhciB0ZXN0IGluIHZhbGlkX3BhcmFtZXRlcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSB0ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkX3BhcmFtZXRlcnNbdGVzdF0uaW5kZXhPZihmcC51dGlsLnR5cGVPZihvcHRpb25zW2tleV0pKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiQ29udmVyc2lvbiBwYXJhbWV0ZXIgXCIgKyBrZXkgKyBcIiBpcyBub3QgdGhlIHJpZ2h0IHR5cGU6IFwiICsgb3B0aW9uc1trZXldICsgXCIuIFNob3VsZCBiZSBhIFwiICsgdmFsaWRfcGFyYW1ldGVyc1t0ZXN0XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJDb252ZXJzaW9uIHBhcmFtZXRlciBcIiArIGtleSArIFwiIGlzIG5vdCBhIHZhbGlkIHBhcmFtZXRlci5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24oZnBfdXJsLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgY2hlY2tQYXJhbWV0ZXJzKG9wdGlvbnMpO1xuICAgICAgICBpZiAob3B0aW9ucy5jcm9wICYmIGZwLnV0aWwuaXNBcnJheShvcHRpb25zLmNyb3ApKSB7XG4gICAgICAgICAgICBvcHRpb25zLmNyb3AgPSBvcHRpb25zLmNyb3Auam9pbihcIixcIik7XG4gICAgICAgIH1cbiAgICAgICAgZnAuYWpheC5wb3N0KGZwX3VybCArIFwiL2NvbnZlcnRcIiwge1xuICAgICAgICAgICAgZGF0YTogb3B0aW9ucyxcbiAgICAgICAgICAgIGpzb246IHRydWUsXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihmcGZpbGUpIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZnAudXRpbC5zdGFuZGFyZGl6ZUZQRmlsZShmcGZpbGUpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24obXNnLCBzdGF0dXMsIHhocikge1xuICAgICAgICAgICAgICAgIGlmIChtc2cgPT09IFwibm90X2ZvdW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTQxKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwiYmFkX3BhcmFtc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDE0MikpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9hdXRob3JpemVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoNDAzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTQzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2dyZXNzOiBvblByb2dyZXNzXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY29udmVydDogY29udmVydCxcbiAgICAgICAgbWFwUmVzdFBhcmFtczogbWFwUmVzdFBhcmFtc1xuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwiZXJyb3JzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIEZQRXJyb3IgPSBmdW5jdGlvbihjb2RlKSB7XG4gICAgICAgIGlmICh0aGlzID09PSB3aW5kb3cpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRlBFcnJvcihjb2RlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvZGUgPSBjb2RlO1xuICAgICAgICBpZiAoZmlsZXBpY2tlci5kZWJ1Zykge1xuICAgICAgICAgICAgdmFyIGluZm8gPSBmaWxlcGlja2VyLmVycm9yX21hcFt0aGlzLmNvZGVdO1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlID0gaW5mby5tZXNzYWdlO1xuICAgICAgICAgICAgdGhpcy5tb3JlSW5mbyA9IGluZm8ubW9yZUluZm87XG4gICAgICAgICAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiRlBFcnJvciBcIiArIHRoaXMuY29kZSArIFwiOiBcIiArIHRoaXMubWVzc2FnZSArIFwiLiBGb3IgaGVscCwgc2VlIFwiICsgdGhpcy5tb3JlSW5mbztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiRlBFcnJvciBcIiArIHRoaXMuY29kZSArIFwiLiBJbmNsdWRlIGZpbGVwaWNrZXJfZGVidWcuanMgZm9yIG1vcmUgaW5mb1wiO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIEZQRXJyb3IuaXNDbGFzcyA9IHRydWU7XG4gICAgdmFyIGhhbmRsZUVycm9yID0gZnVuY3Rpb24oZnBlcnJvcikge1xuICAgICAgICBpZiAoZmlsZXBpY2tlci5kZWJ1Zykge1xuICAgICAgICAgICAgZnAudXRpbC5jb25zb2xlLmVycm9yKGZwZXJyb3IudG9TdHJpbmcoKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIEZQRXJyb3I6IEZQRXJyb3IsXG4gICAgICAgIGhhbmRsZUVycm9yOiBoYW5kbGVFcnJvclxuICAgIH07XG59LCB0cnVlKTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXMsIFZFUlNJT04gPSBcIjIuNC4xMVwiO1xuICAgIGZwLkFQSV9WRVJTSU9OID0gXCJ2MlwiO1xuICAgIHZhciBzZXRLZXkgPSBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgZnAuYXBpa2V5ID0ga2V5O1xuICAgIH07XG4gICAgdmFyIEZpbGVwaWNrZXJFeGNlcHRpb24gPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgICAgIHRoaXMudGV4dCA9IHRleHQ7XG4gICAgICAgIHRoaXMudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBcIkZpbGVwaWNrZXJFeGNlcHRpb246IFwiICsgdGhpcy50ZXh0O1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIEZpbGVwaWNrZXJFeGNlcHRpb24uaXNDbGFzcyA9IHRydWU7XG4gICAgdmFyIHBpY2sgPSBmdW5jdGlvbihvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgZnAudXRpbC5jaGVja0FwaUtleSgpO1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIHJldHVybiBmcC5waWNrZXIuY3JlYXRlUGlja2VyKG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgZmFsc2UsIGZhbHNlLCBvblByb2dyZXNzKTtcbiAgICB9O1xuICAgIHZhciBwaWNrTXVsdGlwbGUgPSBmdW5jdGlvbihvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgZnAudXRpbC5jaGVja0FwaUtleSgpO1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb25Qcm9ncmVzcyA9IG9uRXJyb3I7XG4gICAgICAgICAgICBvbkVycm9yID0gb25TdWNjZXNzO1xuICAgICAgICAgICAgb25TdWNjZXNzID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb25TdWNjZXNzID0gb25TdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIG9uRXJyb3IgPSBvbkVycm9yIHx8IGZwLmVycm9ycy5oYW5kbGVFcnJvcjtcbiAgICAgICAgcmV0dXJuIGZwLnBpY2tlci5jcmVhdGVQaWNrZXIob3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCB0cnVlLCBmYWxzZSwgb25Qcm9ncmVzcyk7XG4gICAgfTtcbiAgICB2YXIgcGlja0FuZFN0b3JlID0gZnVuY3Rpb24ocGlja2VyX29wdGlvbnMsIHN0b3JlX29wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBmcC51dGlsLmNoZWNrQXBpS2V5KCk7XG4gICAgICAgIGlmICghcGlja2VyX29wdGlvbnMgfHwgIXN0b3JlX29wdGlvbnMgfHwgdHlwZW9mIHBpY2tlcl9vcHRpb25zID09PSBcImZ1bmN0aW9uXCIgfHwgdHlwZW9mIHBpY2tlcl9vcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiTm90IGFsbCByZXF1aXJlZCBwYXJhbWV0ZXJzIGdpdmVuLCBtaXNzaW5nIHBpY2tlciBvciBzdG9yZSBvcHRpb25zXCIpO1xuICAgICAgICB9XG4gICAgICAgIG9uRXJyb3IgPSBvbkVycm9yIHx8IGZwLmVycm9ycy5oYW5kbGVFcnJvcjtcbiAgICAgICAgdmFyIG11bHRpcGxlID0gISFwaWNrZXJfb3B0aW9ucy5tdWx0aXBsZTtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSAhIXBpY2tlcl9vcHRpb25zID8gZnAudXRpbC5jbG9uZShwaWNrZXJfb3B0aW9ucykgOiB7fTtcbiAgICAgICAgb3B0aW9ucy5zdG9yZUxvY2F0aW9uID0gc3RvcmVfb3B0aW9ucy5sb2NhdGlvbiB8fCBcIlMzXCI7XG4gICAgICAgIG9wdGlvbnMuc3RvcmVQYXRoID0gc3RvcmVfb3B0aW9ucy5wYXRoO1xuICAgICAgICBvcHRpb25zLnN0b3JlQ29udGFpbmVyID0gc3RvcmVfb3B0aW9ucy5zdG9yZUNvbnRhaW5lciB8fCBzdG9yZV9vcHRpb25zLmNvbnRhaW5lcjtcbiAgICAgICAgb3B0aW9ucy5zdG9yZVJlZ2lvbiA9IHN0b3JlX29wdGlvbnMuc3RvcmVSZWdpb247XG4gICAgICAgIG9wdGlvbnMuc3RvcmVBY2Nlc3MgPSBzdG9yZV9vcHRpb25zLmFjY2VzcyB8fCBcInByaXZhdGVcIjtcbiAgICAgICAgaWYgKG11bHRpcGxlICYmIG9wdGlvbnMuc3RvcmVQYXRoKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5zdG9yZVBhdGguY2hhckF0KG9wdGlvbnMuc3RvcmVQYXRoLmxlbmd0aCAtIDEpICE9PSBcIi9cIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwicGlja0FuZFN0b3JlIHdpdGggbXVsdGlwbGUgZmlsZXMgcmVxdWlyZXMgYSBwYXRoIHRoYXQgZW5kcyBpbiBcIiAvIFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBzdWNjZXNzID0gb25TdWNjZXNzO1xuICAgICAgICBpZiAoIW11bHRpcGxlKSB7XG4gICAgICAgICAgICBzdWNjZXNzID0gZnVuY3Rpb24ocmVzcCkge1xuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhbIHJlc3AgXSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmcC5waWNrZXIuY3JlYXRlUGlja2VyKG9wdGlvbnMsIHN1Y2Nlc3MsIG9uRXJyb3IsIG11bHRpcGxlLCBmYWxzZSwgb25Qcm9ncmVzcyk7XG4gICAgfTtcbiAgICB2YXIgcGlja0ZvbGRlciA9IGZ1bmN0aW9uKG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBmcC51dGlsLmNoZWNrQXBpS2V5KCk7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBvbkVycm9yID0gb25TdWNjZXNzO1xuICAgICAgICAgICAgb25TdWNjZXNzID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb25TdWNjZXNzID0gb25TdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIG9uRXJyb3IgPSBvbkVycm9yIHx8IGZwLmVycm9ycy5oYW5kbGVFcnJvcjtcbiAgICAgICAgcmV0dXJuIGZwLnBpY2tlci5jcmVhdGVQaWNrZXIob3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBmYWxzZSwgdHJ1ZSwgb25Qcm9ncmVzcyk7XG4gICAgfTtcbiAgICB2YXIgcmVhZCA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgZnAudXRpbC5jaGVja0FwaUtleSgpO1xuICAgICAgICBpZiAoIWlucHV0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIk5vIGlucHV0IGdpdmVuIC0gbm90aGluZyB0byByZWFkIVwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb25Qcm9ncmVzcyA9IG9uRXJyb3I7XG4gICAgICAgICAgICBvbkVycm9yID0gb25TdWNjZXNzO1xuICAgICAgICAgICAgb25TdWNjZXNzID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb25TdWNjZXNzID0gb25TdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIG9uRXJyb3IgPSBvbkVycm9yIHx8IGZwLmVycm9ycy5oYW5kbGVFcnJvcjtcbiAgICAgICAgb25Qcm9ncmVzcyA9IG9uUHJvZ3Jlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgaWYgKGZwLnV0aWwuaXNGUFVybChpbnB1dCkpIHtcbiAgICAgICAgICAgICAgICBmcC5maWxlcy5yZWFkRnJvbUZQVXJsKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmcC5maWxlcy5yZWFkRnJvbVVybChpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChmcC51dGlsLmlzRmlsZUlucHV0RWxlbWVudChpbnB1dCkpIHtcbiAgICAgICAgICAgIGlmICghaW5wdXQuZmlsZXMpIHtcbiAgICAgICAgICAgICAgICBzdG9yZVRoZW5SZWFkKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5maWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMTUpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnAuZmlsZXMucmVhZEZyb21GaWxlKGlucHV0LmZpbGVzWzBdLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGZwLnV0aWwuaXNGaWxlKGlucHV0KSkge1xuICAgICAgICAgICAgZnAuZmlsZXMucmVhZEZyb21GaWxlKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGlucHV0LnVybCkge1xuICAgICAgICAgICAgZnAuZmlsZXMucmVhZEZyb21GUFVybChpbnB1dC51cmwsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkNhbm5vdCByZWFkIGdpdmVuIGlucHV0OiBcIiArIGlucHV0ICsgXCIuIE5vdCBhIHVybCwgZmlsZSBpbnB1dCwgRE9NIEZpbGUsIG9yIEZQRmlsZSBvYmplY3QuXCIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgc3RvcmVUaGVuUmVhZCA9IGZ1bmN0aW9uKGlucHV0LCByZWFkT3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIG9uUHJvZ3Jlc3MoMTApO1xuICAgICAgICBmcC5zdG9yZShpbnB1dCwgZnVuY3Rpb24oZnBmaWxlKSB7XG4gICAgICAgICAgICBvblByb2dyZXNzKDUwKTtcbiAgICAgICAgICAgIGZwLnJlYWQoZnBmaWxlLCByZWFkT3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MoNTAgKyBwcm9ncmVzcyAvIDIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIG9uRXJyb3IpO1xuICAgIH07XG4gICAgdmFyIHdyaXRlID0gZnVuY3Rpb24oZnBmaWxlLCBpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGZwLnV0aWwuY2hlY2tBcGlLZXkoKTtcbiAgICAgICAgaWYgKCFmcGZpbGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiTm8gZnBmaWxlIGdpdmVuIC0gbm90aGluZyB0byB3cml0ZSB0byFcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlucHV0ID09PSB1bmRlZmluZWQgfHwgaW5wdXQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiTm8gaW5wdXQgZ2l2ZW4gLSBub3RoaW5nIHRvIHdyaXRlIVwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb25Qcm9ncmVzcyA9IG9uRXJyb3I7XG4gICAgICAgICAgICBvbkVycm9yID0gb25TdWNjZXNzO1xuICAgICAgICAgICAgb25TdWNjZXNzID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb25TdWNjZXNzID0gb25TdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIG9uRXJyb3IgPSBvbkVycm9yIHx8IGZwLmVycm9ycy5oYW5kbGVFcnJvcjtcbiAgICAgICAgb25Qcm9ncmVzcyA9IG9uUHJvZ3Jlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgdmFyIGZwX3VybDtcbiAgICAgICAgaWYgKGZwLnV0aWwuaXNGUFVybChmcC51dGlsLmdldEZQVXJsKGZwZmlsZSkpKSB7XG4gICAgICAgICAgICBmcF91cmwgPSBmcGZpbGU7XG4gICAgICAgIH0gZWxzZSBpZiAoZnBmaWxlLnVybCkge1xuICAgICAgICAgICAgZnBfdXJsID0gZnBmaWxlLnVybDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiSW52YWxpZCBmaWxlIHRvIHdyaXRlIHRvOiBcIiArIGZwZmlsZSArIFwiLiBOb3QgYSBmaWxlcGlja2VyIHVybCBvciBGUEZpbGUgb2JqZWN0LlwiKTtcbiAgICAgICAgfVxuICAgICAgICBmcF91cmwgPSBmcC51dGlsLnRyaW1Db252ZXJ0KGZwLnV0aWwuZ2V0RlBVcmwoZnBfdXJsKSk7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGZwLmZpbGVzLndyaXRlRGF0YVRvRlBVcmwoZnBfdXJsLCBpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChmcC51dGlsLmlzRmlsZUlucHV0RWxlbWVudChpbnB1dCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlucHV0LmZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGZwLmZpbGVzLndyaXRlRmlsZUlucHV0VG9GUFVybChmcF91cmwsIGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQuZmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDExNSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZwLmZpbGVzLndyaXRlRmlsZVRvRlBVcmwoZnBfdXJsLCBpbnB1dC5maWxlc1swXSwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZwLnV0aWwuaXNGaWxlKGlucHV0KSkge1xuICAgICAgICAgICAgICAgIGZwLmZpbGVzLndyaXRlRmlsZVRvRlBVcmwoZnBfdXJsLCBpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQudXJsKSB7XG4gICAgICAgICAgICAgICAgZnAuZmlsZXMud3JpdGVVcmxUb0ZQVXJsKGZwX3VybCwgaW5wdXQudXJsLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkNhbm5vdCByZWFkIGZyb20gZ2l2ZW4gaW5wdXQ6IFwiICsgaW5wdXQgKyBcIi4gTm90IGEgc3RyaW5nLCBmaWxlIGlucHV0LCBET00gRmlsZSwgb3IgRlBGaWxlIG9iamVjdC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciB3cml0ZVVybCA9IGZ1bmN0aW9uKGZwZmlsZSwgaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBmcC51dGlsLmNoZWNrQXBpS2V5KCk7XG4gICAgICAgIGlmICghZnBmaWxlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIk5vIGZwZmlsZSBnaXZlbiAtIG5vdGhpbmcgdG8gd3JpdGUgdG8hXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnB1dCA9PT0gdW5kZWZpbmVkIHx8IGlucHV0ID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIk5vIGlucHV0IGdpdmVuIC0gbm90aGluZyB0byB3cml0ZSFcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MgPSBvbkVycm9yO1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIG9uUHJvZ3Jlc3MgPSBvblByb2dyZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBmcF91cmw7XG4gICAgICAgIGlmIChmcC51dGlsLmlzRlBVcmwoZnAudXRpbC5nZXRGUFVybChmcGZpbGUpKSkge1xuICAgICAgICAgICAgZnBfdXJsID0gZnBmaWxlO1xuICAgICAgICB9IGVsc2UgaWYgKGZwZmlsZS51cmwpIHtcbiAgICAgICAgICAgIGZwX3VybCA9IGZwZmlsZS51cmw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkludmFsaWQgZmlsZSB0byB3cml0ZSB0bzogXCIgKyBmcGZpbGUgKyBcIi4gTm90IGEgZmlsZXBpY2tlciB1cmwgb3IgRlBGaWxlIG9iamVjdC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgZnBfdXJsID0gZnAudXRpbC5nZXRGUFVybChmcF91cmwpO1xuICAgICAgICBmcC5maWxlcy53cml0ZVVybFRvRlBVcmwoZnAudXRpbC50cmltQ29udmVydChmcF91cmwpLCBpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICB9O1xuICAgIHZhciBleHBvcnRGbiA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IpIHtcbiAgICAgICAgZnAudXRpbC5jaGVja0FwaUtleSgpO1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9ICEhb3B0aW9ucyA/IGZwLnV0aWwuY2xvbmUob3B0aW9ucykgOiB7fTtcbiAgICAgICAgb25TdWNjZXNzID0gb25TdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIG9uRXJyb3IgPSBvbkVycm9yIHx8IGZwLmVycm9ycy5oYW5kbGVFcnJvcjtcbiAgICAgICAgdmFyIGZwX3VybDtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gXCJzdHJpbmdcIiAmJiBmcC51dGlsLmlzVXJsKGlucHV0KSkge1xuICAgICAgICAgICAgZnBfdXJsID0gaW5wdXQ7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXQudXJsKSB7XG4gICAgICAgICAgICBmcF91cmwgPSBpbnB1dC51cmw7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMubWltZXR5cGUgJiYgIW9wdGlvbnMuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5taW1ldHlwZSA9IGlucHV0Lm1pbWV0eXBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFvcHRpb25zLnN1Z2dlc3RlZEZpbGVuYW1lKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zdWdnZXN0ZWRGaWxlbmFtZSA9IGlucHV0LmZpbGVuYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJJbnZhbGlkIGZpbGUgdG8gZXhwb3J0OiBcIiArIGlucHV0ICsgXCIuIE5vdCBhIHZhbGlkIHVybCBvciBGUEZpbGUgb2JqZWN0LiBZb3UgbWF5IHdhbnQgdG8gdXNlIGZpbGVwaWNrZXIuc3RvcmUoKSB0byBnZXQgYW4gRlBGaWxlIHRvIGV4cG9ydFwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5zdWdnZXN0ZWRGaWxlbmFtZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5zdWdnZXN0ZWRGaWxlbmFtZSA9IGVuY29kZVVSSShvcHRpb25zLnN1Z2dlc3RlZEZpbGVuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnAuZXhwb3J0ZXIuY3JlYXRlRXhwb3J0ZXIoZnBfdXJsLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IpO1xuICAgIH07XG4gICAgdmFyIHByb2Nlc3NJbWFnZSA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgdmFyIGNvbnZlcnRVcmw7XG4gICAgICAgIGZwLnV0aWwuY2hlY2tBcGlLZXkoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uRXJyb3IgPSBvblN1Y2Nlc3M7XG4gICAgICAgICAgICBvblN1Y2Nlc3MgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBvblN1Y2Nlc3MgPSBvblN1Y2Nlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgb25FcnJvciA9IG9uRXJyb3IgfHwgZnAuZXJyb3JzLmhhbmRsZUVycm9yO1xuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBjb252ZXJ0VXJsID0gaW5wdXQ7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXQudXJsKSB7XG4gICAgICAgICAgICBjb252ZXJ0VXJsID0gaW5wdXQudXJsO1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zLmZpbGVuYW1lKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5maWxlbmFtZSA9IGlucHV0LmZpbGVuYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJJbnZhbGlkIGZpbGUgdG8gY29udmVydDogXCIgKyBpbnB1dCArIFwiLiBOb3QgYSB2YWxpZCB1cmwgb3IgRlBGaWxlIG9iamVjdCBvciBub3QgZmlsZXBpY2tlciB1cmwuIFlvdSBjYW4gY29udmVydCBvbmx5IGZpbGVwaWNrZXIgdXJsIGltYWdlcy5cIik7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy5jb252ZXJ0VXJsID0gY29udmVydFVybDtcbiAgICAgICAgb3B0aW9ucy5tdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICBvcHRpb25zLnNlcnZpY2VzID0gWyBcIkNPTlZFUlRcIiwgXCJDT01QVVRFUlwiIF07XG4gICAgICAgIG9wdGlvbnMuYmFja2dyb3VuZFVwbG9hZCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuaGlkZSA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZnAucGlja2VyLmNyZWF0ZVBpY2tlcihvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIGZhbHNlLCBmYWxzZSwgb25Qcm9ncmVzcywgdHJ1ZSk7XG4gICAgfTtcbiAgICB2YXIgc3RvcmUgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGZwLnV0aWwuY2hlY2tBcGlLZXkoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MgPSBvbkVycm9yO1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9ICEhb3B0aW9ucyA/IGZwLnV0aWwuY2xvbmUob3B0aW9ucykgOiB7fTtcbiAgICAgICAgb25TdWNjZXNzID0gb25TdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIG9uRXJyb3IgPSBvbkVycm9yIHx8IGZwLmVycm9ycy5oYW5kbGVFcnJvcjtcbiAgICAgICAgb25Qcm9ncmVzcyA9IG9uUHJvZ3Jlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgZnAuZmlsZXMuc3RvcmVEYXRhKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGZwLnV0aWwuaXNGaWxlSW5wdXRFbGVtZW50KGlucHV0KSkge1xuICAgICAgICAgICAgICAgIGlmICghaW5wdXQuZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZnAuZmlsZXMuc3RvcmVGaWxlSW5wdXQoaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5maWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTE1KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZnAuZmlsZXMuc3RvcmVGaWxlKGlucHV0LmZpbGVzWzBdLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZnAudXRpbC5pc0ZpbGUoaW5wdXQpKSB7XG4gICAgICAgICAgICAgICAgZnAuZmlsZXMuc3RvcmVGaWxlKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpbnB1dC51cmwpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMuZmlsZW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5maWxlbmFtZSA9IGlucHV0LmZpbGVuYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmcC5maWxlcy5zdG9yZVVybChpbnB1dC51cmwsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiQ2Fubm90IHN0b3JlIGdpdmVuIGlucHV0OiBcIiArIGlucHV0ICsgXCIuIE5vdCBhIHN0cmluZywgZmlsZSBpbnB1dCwgRE9NIEZpbGUsIG9yIEZQRmlsZSBvYmplY3QuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgc3RvcmVVcmwgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGZwLnV0aWwuY2hlY2tBcGlLZXkoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MgPSBvbkVycm9yO1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIG9uUHJvZ3Jlc3MgPSBvblByb2dyZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIGZwLmZpbGVzLnN0b3JlVXJsKGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdmFyIHN0YXQgPSBmdW5jdGlvbihmcGZpbGUsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvcikge1xuICAgICAgICBmcC51dGlsLmNoZWNrQXBpS2V5KCk7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBvbkVycm9yID0gb25TdWNjZXNzO1xuICAgICAgICAgICAgb25TdWNjZXNzID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb25TdWNjZXNzID0gb25TdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIG9uRXJyb3IgPSBvbkVycm9yIHx8IGZwLmVycm9ycy5oYW5kbGVFcnJvcjtcbiAgICAgICAgdmFyIGZwX3VybDtcbiAgICAgICAgaWYgKGZwLnV0aWwuaXNGUFVybChmcC51dGlsLmdldEZQVXJsKGZwZmlsZSkpKSB7XG4gICAgICAgICAgICBmcF91cmwgPSBmcGZpbGU7XG4gICAgICAgIH0gZWxzZSBpZiAoZnBmaWxlLnVybCkge1xuICAgICAgICAgICAgZnBfdXJsID0gZnBmaWxlLnVybDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiSW52YWxpZCBmaWxlIHRvIGdldCBtZXRhZGF0YSBmb3I6IFwiICsgZnBmaWxlICsgXCIuIE5vdCBhIGZpbGVwaWNrZXIgdXJsIG9yIEZQRmlsZSBvYmplY3QuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGZwX3VybCA9IGZwLnV0aWwuZ2V0RlBVcmwoZnBfdXJsKTtcbiAgICAgICAgZnAuZmlsZXMuc3RhdChmcC51dGlsLnRyaW1Db252ZXJ0KGZwX3VybCksIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvcik7XG4gICAgfTtcbiAgICB2YXIgcmVtb3ZlID0gZnVuY3Rpb24oZnBmaWxlLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IpIHtcbiAgICAgICAgZnAudXRpbC5jaGVja0FwaUtleSgpO1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IG9wdGlvbnM7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9uU3VjY2VzcyA9IG9uU3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICBvbkVycm9yID0gb25FcnJvciB8fCBmcC5lcnJvcnMuaGFuZGxlRXJyb3I7XG4gICAgICAgIHZhciBmcF91cmw7XG4gICAgICAgIGlmIChmcC51dGlsLmlzRlBVcmwoZnAudXRpbC5nZXRGUFVybChmcGZpbGUpKSkge1xuICAgICAgICAgICAgZnBfdXJsID0gZnBmaWxlO1xuICAgICAgICB9IGVsc2UgaWYgKGZwZmlsZS51cmwpIHtcbiAgICAgICAgICAgIGZwX3VybCA9IGZwZmlsZS51cmw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkludmFsaWQgZmlsZSB0byByZW1vdmU6IFwiICsgZnBmaWxlICsgXCIuIE5vdCBhIGZpbGVwaWNrZXIgdXJsIG9yIEZQRmlsZSBvYmplY3QuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGZwX3VybCA9IGZwLnV0aWwuZ2V0RlBVcmwoZnBfdXJsKTtcbiAgICAgICAgZnAuZmlsZXMucmVtb3ZlKGZwLnV0aWwudHJpbUNvbnZlcnQoZnBfdXJsKSwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yKTtcbiAgICB9O1xuICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24oZnBmaWxlLCBjb252ZXJ0X29wdGlvbnMsIHN0b3JlX29wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBmcC51dGlsLmNoZWNrQXBpS2V5KCk7XG4gICAgICAgIGlmICghZnBmaWxlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIk5vIGZwZmlsZSBnaXZlbiAtIG5vdGhpbmcgdG8gY29udmVydCFcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBzdG9yZV9vcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MgPSBvbkVycm9yO1xuICAgICAgICAgICAgb25FcnJvciA9IG9uU3VjY2VzcztcbiAgICAgICAgICAgIG9uU3VjY2VzcyA9IHN0b3JlX29wdGlvbnM7XG4gICAgICAgICAgICBzdG9yZV9vcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9wdGlvbnMgPSAhIWNvbnZlcnRfb3B0aW9ucyA/IGZwLnV0aWwuY2xvbmUoY29udmVydF9vcHRpb25zKSA6IHt9O1xuICAgICAgICBzdG9yZV9vcHRpb25zID0gc3RvcmVfb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb25TdWNjZXNzID0gb25TdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIG9uRXJyb3IgPSBvbkVycm9yIHx8IGZwLmVycm9ycy5oYW5kbGVFcnJvcjtcbiAgICAgICAgb25Qcm9ncmVzcyA9IG9uUHJvZ3Jlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgaWYgKHN0b3JlX29wdGlvbnMubG9jYXRpb24pIHtcbiAgICAgICAgICAgIG9wdGlvbnMuc3RvcmVMb2NhdGlvbiA9IHN0b3JlX29wdGlvbnMubG9jYXRpb247XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0b3JlX29wdGlvbnMucGF0aCkge1xuICAgICAgICAgICAgb3B0aW9ucy5zdG9yZVBhdGggPSBzdG9yZV9vcHRpb25zLnBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0b3JlX29wdGlvbnMuY29udGFpbmVyKSB7XG4gICAgICAgICAgICBvcHRpb25zLnN0b3JlQ29udGFpbmVyID0gc3RvcmVfb3B0aW9ucy5jb250YWluZXI7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy5zdG9yZUFjY2VzcyA9IHN0b3JlX29wdGlvbnMuYWNjZXNzIHx8IFwicHJpdmF0ZVwiO1xuICAgICAgICB2YXIgZnBfdXJsO1xuICAgICAgICBpZiAoZnAudXRpbC5pc0ZQVXJsKGZwLnV0aWwuZ2V0RlBVcmwoZnBmaWxlKSkpIHtcbiAgICAgICAgICAgIGZwX3VybCA9IGZwZmlsZTtcbiAgICAgICAgfSBlbHNlIGlmIChmcGZpbGUudXJsKSB7XG4gICAgICAgICAgICBmcF91cmwgPSBmcGZpbGUudXJsO1xuICAgICAgICAgICAgaWYgKCFmcC5taW1ldHlwZXMubWF0Y2hlc01pbWV0eXBlKGZwZmlsZS5taW1ldHlwZSwgXCJpbWFnZS8qXCIpICYmICFmcC5taW1ldHlwZXMubWF0Y2hlc01pbWV0eXBlKGZwZmlsZS5taW1ldHlwZSwgXCJhcHBsaWNhdGlvbi9wZGZcIikpIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxNDIpKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZnAuRmlsZXBpY2tlckV4Y2VwdGlvbihcIkludmFsaWQgZmlsZSB0byBjb252ZXJ0OiBcIiArIGZwZmlsZSArIFwiLiBOb3QgYSBmaWxlcGlja2VyIHVybCBvciBGUEZpbGUgb2JqZWN0LlwiKTtcbiAgICAgICAgfVxuICAgICAgICBmcF91cmwgPSBmcC51dGlsLmdldEZQVXJsKGZwX3VybCk7XG4gICAgICAgIGlmIChmcF91cmwuaW5kZXhPZihcIi9jb252ZXJ0XCIpID4gLTEpIHtcbiAgICAgICAgICAgIHZhciByZXN0Q29udmVydE9wdGlvbnMgPSBmcC51dGlsLnBhcnNlVXJsKGZwX3VybCkucGFyYW1zO1xuICAgICAgICAgICAgcmVzdENvbnZlcnRPcHRpb25zID0gZnAuY29udmVyc2lvbnMubWFwUmVzdFBhcmFtcyhyZXN0Q29udmVydE9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKHJlc3RDb252ZXJ0T3B0aW9ucy5jcm9wKSB7XG4gICAgICAgICAgICAgICAgZnAudXRpbC5zZXREZWZhdWx0KHJlc3RDb252ZXJ0T3B0aW9ucywgXCJjcm9wX2ZpcnN0XCIsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgYXR0ciBpbiByZXN0Q29udmVydE9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBmcC51dGlsLnNldERlZmF1bHQob3B0aW9ucywgYXR0ciwgcmVzdENvbnZlcnRPcHRpb25zW2F0dHJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmcC5jb252ZXJzaW9ucy5jb252ZXJ0KGZwLnV0aWwudHJpbUNvbnZlcnQoZnBfdXJsKSwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3RXaWRnZXQgPSBmdW5jdGlvbihiYXNlKSB7XG4gICAgICAgIHJldHVybiBmcC53aWRnZXRzLmNvbnN0cnVjdFdpZGdldChiYXNlKTtcbiAgICB9O1xuICAgIHZhciBtYWtlRHJvcFBhbmUgPSBmdW5jdGlvbihkaXYsIG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIGZwLmRyYWdkcm9wLm1ha2VEcm9wUGFuZShkaXYsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdmFyIHNldFJlc3BvbnNpdmVPcHRpb25zID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gZnAucmVzcG9uc2l2ZUltYWdlcy5zZXRSZXNwb25zaXZlT3B0aW9ucyhvcHRpb25zKTtcbiAgICB9O1xuICAgIHZhciByZXNwb25zaXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGZwLnJlc3BvbnNpdmVJbWFnZXMudXBkYXRlLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBzZXRLZXk6IHNldEtleSxcbiAgICAgICAgc2V0UmVzcG9uc2l2ZU9wdGlvbnM6IHNldFJlc3BvbnNpdmVPcHRpb25zLFxuICAgICAgICBwaWNrOiBwaWNrLFxuICAgICAgICBwaWNrRm9sZGVyOiBwaWNrRm9sZGVyLFxuICAgICAgICBwaWNrTXVsdGlwbGU6IHBpY2tNdWx0aXBsZSxcbiAgICAgICAgcGlja0FuZFN0b3JlOiBwaWNrQW5kU3RvcmUsXG4gICAgICAgIHJlYWQ6IHJlYWQsXG4gICAgICAgIHdyaXRlOiB3cml0ZSxcbiAgICAgICAgd3JpdGVVcmw6IHdyaXRlVXJsLFxuICAgICAgICBcImV4cG9ydFwiOiBleHBvcnRGbixcbiAgICAgICAgZXhwb3J0RmlsZTogZXhwb3J0Rm4sXG4gICAgICAgIHByb2Nlc3NJbWFnZTogcHJvY2Vzc0ltYWdlLFxuICAgICAgICBzdG9yZTogc3RvcmUsXG4gICAgICAgIHN0b3JlVXJsOiBzdG9yZVVybCxcbiAgICAgICAgc3RhdDogc3RhdCxcbiAgICAgICAgbWV0YWRhdGE6IHN0YXQsXG4gICAgICAgIHJlbW92ZTogcmVtb3ZlLFxuICAgICAgICBjb252ZXJ0OiBjb252ZXJ0LFxuICAgICAgICBjb25zdHJ1Y3RXaWRnZXQ6IGNvbnN0cnVjdFdpZGdldCxcbiAgICAgICAgbWFrZURyb3BQYW5lOiBtYWtlRHJvcFBhbmUsXG4gICAgICAgIEZpbGVwaWNrZXJFeGNlcHRpb246IEZpbGVwaWNrZXJFeGNlcHRpb24sXG4gICAgICAgIHJlc3BvbnNpdmU6IHJlc3BvbnNpdmUsXG4gICAgICAgIHZlcnNpb246IFZFUlNJT05cbiAgICB9O1xufSwgdHJ1ZSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcIm1pbWV0eXBlc1wiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBtaW1ldHlwZV9leHRlbnNpb25fbWFwID0ge1xuICAgICAgICBcIi5zdGxcIjogXCJhcHBsaWNhdGlvbi9zbGFcIixcbiAgICAgICAgXCIuaGJzXCI6IFwidGV4dC9odG1sXCIsXG4gICAgICAgIFwiLnBkZlwiOiBcImFwcGxpY2F0aW9uL3BkZlwiLFxuICAgICAgICBcIi5qcGdcIjogXCJpbWFnZS9qcGVnXCIsXG4gICAgICAgIFwiLmpwZWdcIjogXCJpbWFnZS9qcGVnXCIsXG4gICAgICAgIFwiLmpwZVwiOiBcImltYWdlL2pwZWdcIixcbiAgICAgICAgXCIuaW1wXCI6IFwiYXBwbGljYXRpb24veC1pbXByZXNzaW9uaXN0XCIsXG4gICAgICAgIFwiLnZvYlwiOiBcInZpZGVvL2R2ZFwiXG4gICAgfTtcbiAgICB2YXIgbWltZXR5cGVfYmFkX2FycmF5ID0gWyBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiLCBcImFwcGxpY2F0aW9uL2Rvd25sb2FkXCIsIFwiYXBwbGljYXRpb24vZm9yY2UtZG93bmxvYWRcIiwgXCJvY3RldC9zdHJlYW1cIiwgXCJhcHBsaWNhdGlvbi91bmtub3duXCIsIFwiYXBwbGljYXRpb24veC1kb3dubG9hZFwiLCBcImFwcGxpY2F0aW9uL3gtbXNkb3dubG9hZFwiLCBcImFwcGxpY2F0aW9uL3gtc2VjdXJlLWRvd25sb2FkXCIgXTtcbiAgICB2YXIgZ2V0TWltZXR5cGUgPSBmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgIGlmIChmaWxlLnR5cGUpIHtcbiAgICAgICAgICAgIHZhciB0eXBlID0gZmlsZS50eXBlO1xuICAgICAgICAgICAgdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHZhciBiYWRfdHlwZSA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCBtaW1ldHlwZV9iYWRfYXJyYXkubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICBiYWRfdHlwZSA9IGJhZF90eXBlIHx8IHR5cGUgPT09IG1pbWV0eXBlX2JhZF9hcnJheVtuXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYmFkX3R5cGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsZS50eXBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBmaWxlbmFtZSA9IGZpbGUubmFtZSB8fCBmaWxlLmZpbGVOYW1lO1xuICAgICAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZW5hbWUubWF0Y2goL1xcLlxcdyokLyk7XG4gICAgICAgIGlmIChleHRlbnNpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBtaW1ldHlwZV9leHRlbnNpb25fbWFwW2V4dGVuc2lvblswXS50b0xvd2VyQ2FzZSgpXSB8fCBcIlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGZpbGUudHlwZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWxlLnR5cGU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgbWF0Y2hlc01pbWV0eXBlID0gZnVuY3Rpb24odGVzdCwgYWdhaW5zdCkge1xuICAgICAgICBpZiAoIXRlc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBhZ2FpbnN0ID09PSBcIiovKlwiO1xuICAgICAgICB9XG4gICAgICAgIHRlc3QgPSBmcC51dGlsLnRyaW0odGVzdCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgYWdhaW5zdCA9IGZwLnV0aWwudHJpbShhZ2FpbnN0KS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IG1pbWV0eXBlX2JhZF9hcnJheS5sZW5ndGg7IG4rKykge1xuICAgICAgICAgICAgaWYgKHRlc3QgPT09IG1pbWV0eXBlX2JhZF9hcnJheVtuXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0ZXN0X3BhcnRzID0gdGVzdC5zcGxpdChcIi9cIiksIGFnYWluc3RfcGFydHMgPSBhZ2FpbnN0LnNwbGl0KFwiL1wiKTtcbiAgICAgICAgaWYgKGFnYWluc3RfcGFydHNbMF0gPT09IFwiKlwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWdhaW5zdF9wYXJ0c1swXSAhPT0gdGVzdF9wYXJ0c1swXSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhZ2FpbnN0X3BhcnRzWzFdID09PSBcIipcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFnYWluc3RfcGFydHNbMV0gPT09IHRlc3RfcGFydHNbMV07XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRNaW1ldHlwZTogZ2V0TWltZXR5cGUsXG4gICAgICAgIG1hdGNoZXNNaW1ldHlwZTogbWF0Y2hlc01pbWV0eXBlXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJzZXJ2aWNlc1wiLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBDT01QVVRFUjogMSxcbiAgICAgICAgRFJPUEJPWDogMixcbiAgICAgICAgRkFDRUJPT0s6IDMsXG4gICAgICAgIEdJVEhVQjogNCxcbiAgICAgICAgR01BSUw6IDUsXG4gICAgICAgIElNQUdFX1NFQVJDSDogNixcbiAgICAgICAgVVJMOiA3LFxuICAgICAgICBXRUJDQU06IDgsXG4gICAgICAgIEdPT0dMRV9EUklWRTogOSxcbiAgICAgICAgU0VORF9FTUFJTDogMTAsXG4gICAgICAgIElOU1RBR1JBTTogMTEsXG4gICAgICAgIEZMSUNLUjogMTIsXG4gICAgICAgIFZJREVPOiAxMyxcbiAgICAgICAgRVZFUk5PVEU6IDE0LFxuICAgICAgICBQSUNBU0E6IDE1LFxuICAgICAgICBXRUJEQVY6IDE2LFxuICAgICAgICBGVFA6IDE3LFxuICAgICAgICBBTEZSRVNDTzogMTgsXG4gICAgICAgIEJPWDogMTksXG4gICAgICAgIFNLWURSSVZFOiAyMCxcbiAgICAgICAgR0RSSVZFOiAyMSxcbiAgICAgICAgQ1VTVE9NU09VUkNFOiAyMixcbiAgICAgICAgQ0xPVUREUklWRTogMjMsXG4gICAgICAgIEdFTkVSSUM6IDI0LFxuICAgICAgICBDT05WRVJUOiAyNSxcbiAgICAgICAgQVVESU86IDI2XG4gICAgfTtcbn0sIHRydWUpO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJ1cmxzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIGJhc2UgPSBcImh0dHBzOi8vd3d3LmZpbGVwaWNrZXIuaW9cIjtcbiAgICBpZiAod2luZG93LmZpbGVwaWNrZXIuaG9zdG5hbWUpIHtcbiAgICAgICAgYmFzZSA9IHdpbmRvdy5maWxlcGlja2VyLmhvc3RuYW1lO1xuICAgIH1cbiAgICB2YXIgZGlhbG9nX2Jhc2UgPSBiYXNlLnJlcGxhY2UoXCJ3d3dcIiwgXCJkaWFsb2dcIiksIHBpY2tfdXJsID0gZGlhbG9nX2Jhc2UgKyBcIi9kaWFsb2cvb3Blbi9cIiwgZXhwb3J0X3VybCA9IGRpYWxvZ19iYXNlICsgXCIvZGlhbG9nL3NhdmUvXCIsIGNvbnZlcnRfdXJsID0gZGlhbG9nX2Jhc2UgKyBcIi9kaWFsb2cvcHJvY2Vzcy9cIiwgcGlja19mb2xkZXJfdXJsID0gZGlhbG9nX2Jhc2UgKyBcIi9kaWFsb2cvZm9sZGVyL1wiLCBzdG9yZV91cmwgPSBiYXNlICsgXCIvYXBpL3N0b3JlL1wiO1xuICAgIHZhciBhbGxvd2VkQ29udmVyc2lvbnMgPSBbIFwiY3JvcFwiLCBcInJvdGF0ZVwiLCBcImZpbHRlclwiIF07XG4gICAgdmFyIGNvbnN0cnVjdFBpY2tVcmwgPSBmdW5jdGlvbihvcHRpb25zLCBpZCwgbXVsdGlwbGUpIHtcbiAgICAgICAgcmV0dXJuIHBpY2tfdXJsICsgY29uc3RydWN0TW9kYWxRdWVyeShvcHRpb25zLCBpZCkgKyAobXVsdGlwbGUgPyBcIiZtdWx0aT1cIiArICEhbXVsdGlwbGUgOiBcIlwiKSArIChvcHRpb25zLm1pbWV0eXBlcyAhPT0gdW5kZWZpbmVkID8gXCImbT1cIiArIG9wdGlvbnMubWltZXR5cGVzLmpvaW4oXCIsXCIpIDogXCJcIikgKyAob3B0aW9ucy5leHRlbnNpb25zICE9PSB1bmRlZmluZWQgPyBcIiZleHQ9XCIgKyBvcHRpb25zLmV4dGVuc2lvbnMuam9pbihcIixcIikgOiBcIlwiKSArIChvcHRpb25zLm1heFNpemUgPyBcIiZtYXhTaXplPVwiICsgb3B0aW9ucy5tYXhTaXplIDogXCJcIikgKyAob3B0aW9ucy5jdXN0b21Tb3VyY2VDb250YWluZXIgPyBcIiZjdXN0b21Tb3VyY2VDb250YWluZXI9XCIgKyBvcHRpb25zLmN1c3RvbVNvdXJjZUNvbnRhaW5lciA6IFwiXCIpICsgKG9wdGlvbnMuY3VzdG9tU291cmNlUGF0aCA/IFwiJmN1c3RvbVNvdXJjZVBhdGg9XCIgKyBvcHRpb25zLmN1c3RvbVNvdXJjZVBhdGggOiBcIlwiKSArIChvcHRpb25zLm1heEZpbGVzID8gXCImbWF4RmlsZXM9XCIgKyBvcHRpb25zLm1heEZpbGVzIDogXCJcIikgKyAob3B0aW9ucy5mb2xkZXJzICE9PSB1bmRlZmluZWQgPyBcIiZmb2xkZXJzPVwiICsgb3B0aW9ucy5mb2xkZXJzIDogXCJcIikgKyAob3B0aW9ucy5zdG9yZUxvY2F0aW9uID8gXCImc3RvcmVMb2NhdGlvbj1cIiArIG9wdGlvbnMuc3RvcmVMb2NhdGlvbiA6IFwiXCIpICsgKG9wdGlvbnMuc3RvcmVQYXRoID8gXCImc3RvcmVQYXRoPVwiICsgb3B0aW9ucy5zdG9yZVBhdGggOiBcIlwiKSArIChvcHRpb25zLnN0b3JlQ29udGFpbmVyID8gXCImc3RvcmVDb250YWluZXI9XCIgKyBvcHRpb25zLnN0b3JlQ29udGFpbmVyIDogXCJcIikgKyAob3B0aW9ucy5zdG9yZVJlZ2lvbiA/IFwiJnN0b3JlUmVnaW9uPVwiICsgb3B0aW9ucy5zdG9yZVJlZ2lvbiA6IFwiXCIpICsgKG9wdGlvbnMuc3RvcmVBY2Nlc3MgPyBcIiZzdG9yZUFjY2Vzcz1cIiArIG9wdGlvbnMuc3RvcmVBY2Nlc3MgOiBcIlwiKSArIChvcHRpb25zLndlYmNhbSAmJiBvcHRpb25zLndlYmNhbS53ZWJjYW1EaW0gPyBcIiZ3ZGltPVwiICsgb3B0aW9ucy53ZWJjYW0ud2ViY2FtRGltLmpvaW4oXCIsXCIpIDogXCJcIikgKyAob3B0aW9ucy53ZWJjYW1EaW0gPyBcIiZ3ZGltPVwiICsgb3B0aW9ucy53ZWJjYW1EaW0uam9pbihcIixcIikgOiBcIlwiKSArIChvcHRpb25zLndlYmNhbSAmJiBvcHRpb25zLndlYmNhbS52aWRlb1JlcyA/IFwiJnZpZGVvUmVzPVwiICsgb3B0aW9ucy53ZWJjYW0udmlkZW9SZXMgOiBcIlwiKSArIChvcHRpb25zLndlYmNhbSAmJiBvcHRpb25zLndlYmNhbS52aWRlb0xlbiA/IFwiJnZpZGVvTGVuPVwiICsgb3B0aW9ucy53ZWJjYW0udmlkZW9MZW4gOiBcIlwiKSArIChvcHRpb25zLndlYmNhbSAmJiBvcHRpb25zLndlYmNhbS5hdWRpb0xlbiA/IFwiJmF1ZGlvTGVuPVwiICsgb3B0aW9ucy53ZWJjYW0uYXVkaW9MZW4gOiBcIlwiKSArIGNvbnN0cnVjdENvbnZlcnNpb25zUXVlcnkob3B0aW9ucy5jb252ZXJzaW9ucyk7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0Q29udmVydFVybCA9IGZ1bmN0aW9uKG9wdGlvbnMsIGlkKSB7XG4gICAgICAgIHZhciB1cmwgPSBvcHRpb25zLmNvbnZlcnRVcmw7XG4gICAgICAgIGlmICh1cmwuaW5kZXhPZihcIiZcIikgPj0gMCB8fCB1cmwuaW5kZXhPZihcIj9cIikgPj0gMCkge1xuICAgICAgICAgICAgdXJsID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnZlcnRfdXJsICsgY29uc3RydWN0TW9kYWxRdWVyeShvcHRpb25zLCBpZCkgKyBcIiZjdXJsPVwiICsgdXJsICsgY29uc3RydWN0Q29udmVyc2lvbnNRdWVyeShvcHRpb25zLmNvbnZlcnNpb25zKTtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3RQaWNrRm9sZGVyVXJsID0gZnVuY3Rpb24ob3B0aW9ucywgaWQpIHtcbiAgICAgICAgcmV0dXJuIHBpY2tfZm9sZGVyX3VybCArIGNvbnN0cnVjdE1vZGFsUXVlcnkob3B0aW9ucywgaWQpO1xuICAgIH07XG4gICAgdmFyIGNvbnN0cnVjdEV4cG9ydFVybCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucywgaWQpIHtcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKFwiJlwiKSA+PSAwIHx8IHVybC5pbmRleE9mKFwiP1wiKSA+PSAwKSB7XG4gICAgICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXhwb3J0X3VybCArIGNvbnN0cnVjdE1vZGFsUXVlcnkob3B0aW9ucywgaWQpICsgXCImdXJsPVwiICsgdXJsICsgKG9wdGlvbnMubWltZXR5cGUgIT09IHVuZGVmaW5lZCA/IFwiJm09XCIgKyBvcHRpb25zLm1pbWV0eXBlIDogXCJcIikgKyAob3B0aW9ucy5leHRlbnNpb24gIT09IHVuZGVmaW5lZCA/IFwiJmV4dD1cIiArIG9wdGlvbnMuZXh0ZW5zaW9uIDogXCJcIikgKyAob3B0aW9ucy5zdWdnZXN0ZWRGaWxlbmFtZSA/IFwiJmRlZmF1bHRTYXZlYXNOYW1lPVwiICsgb3B0aW9ucy5zdWdnZXN0ZWRGaWxlbmFtZSA6IFwiXCIpO1xuICAgIH07XG4gICAgdmFyIGNvbnN0cnVjdFN0b3JlVXJsID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gc3RvcmVfdXJsICsgb3B0aW9ucy5sb2NhdGlvbiArIFwiP2tleT1cIiArIGZwLmFwaWtleSArIChvcHRpb25zLmJhc2U2NGRlY29kZSA/IFwiJmJhc2U2NGRlY29kZT10cnVlXCIgOiBcIlwiKSArIChvcHRpb25zLm1pbWV0eXBlID8gXCImbWltZXR5cGU9XCIgKyBvcHRpb25zLm1pbWV0eXBlIDogXCJcIikgKyAob3B0aW9ucy5maWxlbmFtZSA/IFwiJmZpbGVuYW1lPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG9wdGlvbnMuZmlsZW5hbWUpIDogXCJcIikgKyAob3B0aW9ucy5wYXRoID8gXCImcGF0aD1cIiArIG9wdGlvbnMucGF0aCA6IFwiXCIpICsgKG9wdGlvbnMuY29udGFpbmVyID8gXCImY29udGFpbmVyPVwiICsgb3B0aW9ucy5jb250YWluZXIgOiBcIlwiKSArIChvcHRpb25zLmFjY2VzcyA/IFwiJmFjY2Vzcz1cIiArIG9wdGlvbnMuYWNjZXNzIDogXCJcIikgKyBjb25zdHJ1Y3RTZWN1cml0eVF1ZXJ5KG9wdGlvbnMpICsgXCImcGx1Z2luPVwiICsgZ2V0UGx1Z2luKCk7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0V3JpdGVVcmwgPSBmdW5jdGlvbihmcF91cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIGZwX3VybCArIFwiP25vbmNlPWZwXCIgKyAoISFvcHRpb25zLmJhc2U2NGRlY29kZSA/IFwiJmJhc2U2NGRlY29kZT10cnVlXCIgOiBcIlwiKSArIChvcHRpb25zLm1pbWV0eXBlID8gXCImbWltZXR5cGU9XCIgKyBvcHRpb25zLm1pbWV0eXBlIDogXCJcIikgKyBjb25zdHJ1Y3RTZWN1cml0eVF1ZXJ5KG9wdGlvbnMpICsgXCImcGx1Z2luPVwiICsgZ2V0UGx1Z2luKCk7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0SG9zdENvbW1GYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcGFydHMgPSBmcC51dGlsLnBhcnNlVXJsKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgcmV0dXJuIHBhcnRzLm9yaWdpbiArIFwiLzQwNFwiO1xuICAgIH07XG4gICAgZnVuY3Rpb24gY29uc3RydWN0TW9kYWxRdWVyeShvcHRpb25zLCBpZCkge1xuICAgICAgICByZXR1cm4gXCI/a2V5PVwiICsgZnAuYXBpa2V5ICsgXCImaWQ9XCIgKyBpZCArIFwiJnJlZmVycmVyPVwiICsgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lICsgXCImaWZyYW1lPVwiICsgKG9wdGlvbnMuY29udGFpbmVyICE9PSBcIndpbmRvd1wiKSArIFwiJnZlcnNpb249XCIgKyBmcC5BUElfVkVSU0lPTiArIChvcHRpb25zLnNlcnZpY2VzID8gXCImcz1cIiArIG9wdGlvbnMuc2VydmljZXMuam9pbihcIixcIikgOiBcIlwiKSArIChvcHRpb25zLmNvbnRhaW5lciAhPT0gdW5kZWZpbmVkID8gXCImY29udGFpbmVyPVwiICsgb3B0aW9ucy5jb250YWluZXIgOiBcIm1vZGFsXCIpICsgKG9wdGlvbnMub3BlblRvID8gXCImbG9jPVwiICsgb3B0aW9ucy5vcGVuVG8gOiBcIlwiKSArIFwiJmxhbmd1YWdlPVwiICsgKG9wdGlvbnMubGFuZ3VhZ2UgfHwgZnAuYnJvd3Nlci5nZXRMYW5ndWFnZSgpKSArIChvcHRpb25zLm1vYmlsZSAhPT0gdW5kZWZpbmVkID8gXCImbW9iaWxlPVwiICsgb3B0aW9ucy5tb2JpbGUgOiBcIlwiKSArIChvcHRpb25zLmJhY2tncm91bmRVcGxvYWQgIT09IHVuZGVmaW5lZCA/IFwiJmJ1PVwiICsgb3B0aW9ucy5iYWNrZ3JvdW5kVXBsb2FkIDogXCJcIikgKyAob3B0aW9ucy5jcm9wUmF0aW8gPyBcIiZjcmF0aW89XCIgKyBvcHRpb25zLmNyb3BSYXRpbyA6IFwiXCIpICsgKG9wdGlvbnMuY3JvcERpbSA/IFwiJmNkaW09XCIgKyBvcHRpb25zLmNyb3BEaW0uam9pbihcIixcIikgOiBcIlwiKSArIChvcHRpb25zLmNyb3BNYXggPyBcIiZjbWF4PVwiICsgb3B0aW9ucy5jcm9wTWF4LmpvaW4oXCIsXCIpIDogXCJcIikgKyAob3B0aW9ucy5jcm9wTWluID8gXCImY21pbj1cIiArIG9wdGlvbnMuY3JvcE1pbi5qb2luKFwiLFwiKSA6IFwiXCIpICsgKG9wdGlvbnMuY3JvcEZvcmNlICE9PSB1bmRlZmluZWQgPyBcIiZjZm9yY2U9XCIgKyBvcHRpb25zLmNyb3BGb3JjZSA6IFwiXCIpICsgKG9wdGlvbnMuaGlkZSAhPT0gdW5kZWZpbmVkID8gXCImaGlkZT1cIiArIG9wdGlvbnMuaGlkZSA6IFwiXCIpICsgKG9wdGlvbnMuY3VzdG9tQ3NzID8gXCImY3NzPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG9wdGlvbnMuY3VzdG9tQ3NzKSA6IFwiXCIpICsgKG9wdGlvbnMuY3VzdG9tVGV4dCA/IFwiJnRleHQ9XCIgKyBlbmNvZGVVUklDb21wb25lbnQob3B0aW9ucy5jdXN0b21UZXh0KSA6IFwiXCIpICsgKG9wdGlvbnMuaW1hZ2VNaW4gPyBcIiZpbWluPVwiICsgb3B0aW9ucy5pbWFnZU1pbi5qb2luKFwiLFwiKSA6IFwiXCIpICsgKG9wdGlvbnMuaW1hZ2VNYXggPyBcIiZpbWF4PVwiICsgb3B0aW9ucy5pbWFnZU1heC5qb2luKFwiLFwiKSA6IFwiXCIpICsgKG9wdGlvbnMuaW1hZ2VEaW0gPyBcIiZpZGltPVwiICsgb3B0aW9ucy5pbWFnZURpbS5qb2luKFwiLFwiKSA6IFwiXCIpICsgKG9wdGlvbnMuaW1hZ2VRdWFsaXR5ID8gXCImaXE9XCIgKyBvcHRpb25zLmltYWdlUXVhbGl0eSA6IFwiXCIpICsgKG9wdGlvbnMubm9GaWxlUmVhZGVyID8gXCImbmZsPVwiICsgb3B0aW9ucy5ub0ZpbGVSZWFkZXIgOiBcIlwiKSArIChmcC51dGlsLmlzQ2FudmFzU3VwcG9ydGVkKCkgPyBcIlwiIDogXCImY2FudmFzPWZhbHNlXCIpICsgKG9wdGlvbnMucmVkaXJlY3RVcmwgPyBcIiZyZWRpcmVjdF91cmw9XCIgKyBvcHRpb25zLnJlZGlyZWN0VXJsIDogXCJcIikgKyAob3B0aW9ucy5zaG93Q2xvc2UgJiYgb3B0aW9ucy5jb250YWluZXIgIT09IFwibW9kYWxcIiA/IFwiJnNob3dDbG9zZT1cIiArIG9wdGlvbnMuc2hvd0Nsb3NlIDogXCJcIikgKyBjb25zdHJ1Y3RTZWN1cml0eVF1ZXJ5KG9wdGlvbnMpICsgXCImcGx1Z2luPVwiICsgZ2V0UGx1Z2luKCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNvbnN0cnVjdFNlY3VyaXR5UXVlcnkob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gKG9wdGlvbnMuc2lnbmF0dXJlID8gXCImc2lnbmF0dXJlPVwiICsgb3B0aW9ucy5zaWduYXR1cmUgOiBcIlwiKSArIChvcHRpb25zLnBvbGljeSA/IFwiJnBvbGljeT1cIiArIG9wdGlvbnMucG9saWN5IDogXCJcIik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldFBsdWdpbigpIHtcbiAgICAgICAgcmV0dXJuIGZpbGVwaWNrZXIucGx1Z2luIHx8IFwianNfbGliXCI7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNvbnN0cnVjdENvbnZlcnNpb25zUXVlcnkoY29udmVyc2lvbnMpIHtcbiAgICAgICAgY29udmVyc2lvbnMgPSBjb252ZXJzaW9ucyB8fCBbXTtcbiAgICAgICAgdmFyIGFsbG93ZWQgPSBbXSwgaSwgajtcbiAgICAgICAgZm9yIChpIGluIGNvbnZlcnNpb25zKSB7XG4gICAgICAgICAgICBmb3IgKGogaW4gYWxsb3dlZENvbnZlcnNpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnZlcnNpb25zW2ldID09PSBhbGxvd2VkQ29udmVyc2lvbnNbal0gJiYgY29udmVyc2lvbnMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dlZC5wdXNoKGNvbnZlcnNpb25zW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhbGxvd2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgYWxsb3dlZC5wdXNoKFwiY3JvcFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXCImY289XCIgKyBhbGxvd2VkLmpvaW4oXCIsXCIpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBCQVNFOiBiYXNlLFxuICAgICAgICBESUFMT0dfQkFTRTogZGlhbG9nX2Jhc2UsXG4gICAgICAgIEFQSV9DT01NOiBiYXNlICsgXCIvZGlhbG9nL2NvbW1faWZyYW1lL1wiLFxuICAgICAgICBDT01NOiBkaWFsb2dfYmFzZSArIFwiL2RpYWxvZy9jb21tX2lmcmFtZS9cIixcbiAgICAgICAgRlBfQ09NTV9GQUxMQkFDSzogZGlhbG9nX2Jhc2UgKyBcIi9kaWFsb2cvY29tbV9oYXNoX2lmcmFtZS9cIixcbiAgICAgICAgU1RPUkU6IHN0b3JlX3VybCxcbiAgICAgICAgUElDSzogcGlja191cmwsXG4gICAgICAgIEVYUE9SVDogZXhwb3J0X3VybCxcbiAgICAgICAgY29uc3RydWN0UGlja1VybDogY29uc3RydWN0UGlja1VybCxcbiAgICAgICAgY29uc3RydWN0Q29udmVydFVybDogY29uc3RydWN0Q29udmVydFVybCxcbiAgICAgICAgY29uc3RydWN0UGlja0ZvbGRlclVybDogY29uc3RydWN0UGlja0ZvbGRlclVybCxcbiAgICAgICAgY29uc3RydWN0RXhwb3J0VXJsOiBjb25zdHJ1Y3RFeHBvcnRVcmwsXG4gICAgICAgIGNvbnN0cnVjdFdyaXRlVXJsOiBjb25zdHJ1Y3RXcml0ZVVybCxcbiAgICAgICAgY29uc3RydWN0U3RvcmVVcmw6IGNvbnN0cnVjdFN0b3JlVXJsLFxuICAgICAgICBjb25zdHJ1Y3RIb3N0Q29tbUZhbGxiYWNrOiBjb25zdHJ1Y3RIb3N0Q29tbUZhbGxiYWNrLFxuICAgICAgICBnZXRQbHVnaW46IGdldFBsdWdpblxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwiYWpheFwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBnZXRfcmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zLm1ldGhvZCA9IFwiR0VUXCI7XG4gICAgICAgIG1ha2VfcmVxdWVzdCh1cmwsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdmFyIHBvc3RfcmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zLm1ldGhvZCA9IFwiUE9TVFwiO1xuICAgICAgICB1cmwgKz0gKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwID8gXCImXCIgOiBcIj9cIikgKyBcIl9jYWNoZUJ1c3Q9XCIgKyBmcC51dGlsLmdldElkKCk7XG4gICAgICAgIG1ha2VfcmVxdWVzdCh1cmwsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdmFyIHRvUXVlcnlTdHJpbmcgPSBmdW5jdGlvbihvYmplY3QsIGJhc2UpIHtcbiAgICAgICAgdmFyIHF1ZXJ5U3RyaW5nID0gW107XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgICAgICAgICAgaWYgKGJhc2UpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBiYXNlICsgXCIuICsga2V5ICsgXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgICAgc3dpdGNoIChmcC51dGlsLnR5cGVPZih2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRvUXVlcnlTdHJpbmcodmFsdWUsIGtleSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgY2FzZSBcImFycmF5XCI6XG4gICAgICAgICAgICAgICAgdmFyIHFzID0ge307XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBxc1tpXSA9IHZhbHVlW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQgPSB0b1F1ZXJ5U3RyaW5nKHFzLCBrZXkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0ga2V5ICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmcucHVzaChyZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBxdWVyeVN0cmluZy5qb2luKFwiJlwiKTtcbiAgICB9O1xuICAgIHZhciBnZXRYaHIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB3aW5kb3cuQWN0aXZlWE9iamVjdChcIk1zeG1sMi5YTUxIVFRQXCIpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgd2luZG93LkFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIG1ha2VfcmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuICAgICAgICB1cmwgPSB1cmwgfHwgXCJcIjtcbiAgICAgICAgdmFyIG1ldGhvZCA9IG9wdGlvbnMubWV0aG9kID8gb3B0aW9ucy5tZXRob2QudG9VcHBlckNhc2UoKSA6IFwiUE9TVFwiO1xuICAgICAgICB2YXIgc3VjY2VzcyA9IG9wdGlvbnMuc3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgZXJyb3IgPSBvcHRpb25zLmVycm9yIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBhc3luYyA9IG9wdGlvbnMuYXN5bmMgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBvcHRpb25zLmFzeW5jO1xuICAgICAgICB2YXIgZGF0YSA9IG9wdGlvbnMuZGF0YSB8fCBudWxsO1xuICAgICAgICB2YXIgcHJvY2Vzc0RhdGEgPSBvcHRpb25zLnByb2Nlc3NEYXRhID09PSB1bmRlZmluZWQgPyB0cnVlIDogb3B0aW9ucy5wcm9jZXNzRGF0YTtcbiAgICAgICAgdmFyIGhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgfHwge307XG4gICAgICAgIHZhciB1cmxQYXJ0cyA9IGZwLnV0aWwucGFyc2VVcmwodXJsKTtcbiAgICAgICAgdmFyIG9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0O1xuICAgICAgICB2YXIgY3Jvc3Nkb21haW4gPSBvcmlnaW4gIT09IHVybFBhcnRzLm9yaWdpbjtcbiAgICAgICAgdmFyIGZpbmlzaGVkID0gZmFsc2U7XG4gICAgICAgIHVybCArPSAodXJsLmluZGV4T2YoXCI/XCIpID49IDAgPyBcIiZcIiA6IFwiP1wiKSArIFwicGx1Z2luPVwiICsgZnAudXJscy5nZXRQbHVnaW4oKTtcbiAgICAgICAgaWYgKGRhdGEgJiYgcHJvY2Vzc0RhdGEpIHtcbiAgICAgICAgICAgIGRhdGEgPSB0b1F1ZXJ5U3RyaW5nKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHhocjtcbiAgICAgICAgaWYgKG9wdGlvbnMueGhyKSB7XG4gICAgICAgICAgICB4aHIgPSBvcHRpb25zLnhocjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHhociA9IGdldFhocigpO1xuICAgICAgICAgICAgaWYgKCF4aHIpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKFwiQWpheCBub3QgYWxsb3dlZFwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geGhyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjcm9zc2RvbWFpbiAmJiB3aW5kb3cuWERvbWFpblJlcXVlc3QgJiYgIShcIndpdGhDcmVkZW50aWFsc1wiIGluIHhocikpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgWERvbWFpbkFqYXgodXJsLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5wcm9ncmVzcyAmJiB4aHIudXBsb2FkKSB7XG4gICAgICAgICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoXCJwcm9ncmVzc1wiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnByb2dyZXNzKE1hdGgucm91bmQoZS5sb2FkZWQgKiA5NSAvIGUudG90YWwpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9uU3RhdGVDaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PSA0ICYmICFmaW5pc2hlZCkge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMucHJvZ3Jlc3MoMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3AgPSB4aHIucmVzcG9uc2VUZXh0O1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5qc29uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3AgPSBmcC5qc29uLmRlY29kZShyZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmVycm9yLmNhbGwoeGhyLCBcIkludmFsaWQganNvbjogXCIgKyByZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyhyZXNwLCB4aHIuc3RhdHVzLCB4aHIpO1xuICAgICAgICAgICAgICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb25lcnJvci5jYWxsKHhociwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBvblN0YXRlQ2hhbmdlO1xuICAgICAgICB2YXIgb25lcnJvciA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgaWYgKGZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9wdGlvbnMucHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnByb2dyZXNzKDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT0gNDAwKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoXCJiYWRfcGFyYW1zXCIsIHRoaXMuc3RhdHVzLCB0aGlzKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdHVzID09IDQwMykge1xuICAgICAgICAgICAgICAgIGVycm9yKFwibm90X2F1dGhvcml6ZWRcIiwgdGhpcy5zdGF0dXMsIHRoaXMpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0dXMgPT0gNDA0KSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoXCJub3RfZm91bmRcIiwgdGhpcy5zdGF0dXMsIHRoaXMpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjcm9zc2RvbWFpbikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT0gNCAmJiB0aGlzLnN0YXR1cyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkNPUlNfbm90X2FsbG93ZWRcIiwgdGhpcy5zdGF0dXMsIHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJDT1JTX2Vycm9yXCIsIHRoaXMuc3RhdHVzLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVycm9yKGVyciwgdGhpcy5zdGF0dXMsIHRoaXMpO1xuICAgICAgICB9O1xuICAgICAgICB4aHIub25lcnJvciA9IG9uZXJyb3I7XG4gICAgICAgIGlmIChkYXRhICYmIG1ldGhvZCA9PSBcIkdFVFwiKSB7XG4gICAgICAgICAgICB1cmwgKz0gKHVybC5pbmRleE9mKFwiP1wiKSAhPT0gLTEgPyBcIiZcIiA6IFwiP1wiKSArIGRhdGE7XG4gICAgICAgICAgICBkYXRhID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB4aHIub3BlbihtZXRob2QsIHVybCwgYXN5bmMpO1xuICAgICAgICBpZiAob3B0aW9ucy5qc29uKSB7XG4gICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIkFjY2VwdFwiLCBcImFwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdFwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQWNjZXB0XCIsIFwidGV4dC9qYXZhc2NyaXB0LCB0ZXh0L2h0bWwsIGFwcGxpY2F0aW9uL3htbCwgdGV4dC94bWwsICovKlwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29udGVudFR5cGUgPSBoZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdIHx8IGhlYWRlcnNbXCJjb250ZW50LXR5cGVcIl07XG4gICAgICAgIGlmIChkYXRhICYmIHByb2Nlc3NEYXRhICYmIChtZXRob2QgPT0gXCJQT1NUXCIgfHwgbWV0aG9kID09IFwiUFVUXCIpICYmIGNvbnRlbnRUeXBlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PXV0Zi04XCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWFkZXJzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gaGVhZGVycykge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgaGVhZGVyc1trZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB4aHIuc2VuZChkYXRhKTtcbiAgICAgICAgcmV0dXJuIHhocjtcbiAgICB9O1xuICAgIHZhciBYRG9tYWluQWpheCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuICAgICAgICBpZiAoIXdpbmRvdy5YRG9tYWluUmVxdWVzdCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1ldGhvZCA9IG9wdGlvbnMubWV0aG9kID8gb3B0aW9ucy5tZXRob2QudG9VcHBlckNhc2UoKSA6IFwiUE9TVFwiO1xuICAgICAgICB2YXIgc3VjY2VzcyA9IG9wdGlvbnMuc3VjY2VzcyB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgZXJyb3IgPSBvcHRpb25zLmVycm9yIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBkYXRhID0gb3B0aW9ucy5kYXRhIHx8IHt9O1xuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLnByb3RvY29sID09IFwiaHR0cDpcIikge1xuICAgICAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoXCJodHRwczpcIiwgXCJodHRwOlwiKTtcbiAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgPT0gXCJodHRwczpcIikge1xuICAgICAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoXCJodHRwOlwiLCBcImh0dHBzOlwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5hc3luYykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJBc3luY3Jvbm91cyBDcm9zcy1kb21haW4gcmVxdWVzdHMgYXJlIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1ldGhvZCAhPT0gXCJHRVRcIiAmJiBtZXRob2QgIT09IFwiUE9TVFwiKSB7XG4gICAgICAgICAgICBkYXRhLl9tZXRob2QgPSBtZXRob2Q7XG4gICAgICAgICAgICBtZXRob2QgPSBcIlBPU1RcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5wcm9jZXNzRGF0YSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhID8gdG9RdWVyeVN0cmluZyhkYXRhKSA6IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEgJiYgbWV0aG9kID09IFwiR0VUXCIpIHtcbiAgICAgICAgICAgIHVybCArPSAodXJsLmluZGV4T2YoXCI/XCIpID49IDAgPyBcIiZcIiA6IFwiP1wiKSArIGRhdGE7XG4gICAgICAgICAgICBkYXRhID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB1cmwgKz0gKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwID8gXCImXCIgOiBcIj9cIikgKyBcIl94ZHI9dHJ1ZSZfY2FjaGVCdXN0PVwiICsgZnAudXRpbC5nZXRJZCgpO1xuICAgICAgICB2YXIgeGRyID0gbmV3IHdpbmRvdy5YRG9tYWluUmVxdWVzdCgpO1xuICAgICAgICB4ZHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgcmVzcCA9IHhkci5yZXNwb25zZVRleHQ7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5wcm9ncmVzcykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMucHJvZ3Jlc3MoMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmpzb24pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXNwID0gZnAuanNvbi5kZWNvZGUocmVzcCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkludmFsaWQganNvbjogXCIgKyByZXNwLCAyMDAsIHhkcik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdWNjZXNzKHJlc3AsIDIwMCwgeGRyKTtcbiAgICAgICAgfTtcbiAgICAgICAgeGRyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLnByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5wcm9ncmVzcygxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXJyb3IoeGRyLnJlc3BvbnNlVGV4dCB8fCBcIkNPUlNfZXJyb3JcIiwgdGhpcy5zdGF0dXMgfHwgNTAwLCB0aGlzKTtcbiAgICAgICAgfTtcbiAgICAgICAgeGRyLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbigpIHt9O1xuICAgICAgICB4ZHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgeGRyLnRpbWVvdXQgPSAzZTQ7XG4gICAgICAgIHhkci5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcbiAgICAgICAgeGRyLnNlbmQoZGF0YSk7XG4gICAgICAgIHJldHVybiB4ZHI7XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBnZXQ6IGdldF9yZXF1ZXN0LFxuICAgICAgICBwb3N0OiBwb3N0X3JlcXVlc3QsXG4gICAgICAgIHJlcXVlc3Q6IG1ha2VfcmVxdWVzdFxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwiZmlsZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgcmVhZEZyb21GUFVybCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIHZhciB0ZW1wNjQgPSBvcHRpb25zLmJhc2U2NGVuY29kZSA9PT0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAodGVtcDY0KSB7XG4gICAgICAgICAgICBvcHRpb25zLmJhc2U2NGVuY29kZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy5iYXNlNjRlbmNvZGUgPSBvcHRpb25zLmJhc2U2NGVuY29kZSAhPT0gZmFsc2U7XG4gICAgICAgIHZhciBzdWNjZXNzID0gZnVuY3Rpb24ocmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICBpZiAodGVtcDY0KSB7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2VUZXh0ID0gZnAuYmFzZTY0LmRlY29kZShyZXNwb25zZVRleHQsICEhb3B0aW9ucy5hc1RleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlVGV4dCk7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRGcm9tVXJsLmNhbGwodGhpcywgdXJsLCBvcHRpb25zLCBzdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKTtcbiAgICB9O1xuICAgIHZhciByZWFkRnJvbVVybCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNhY2hlICE9PSB0cnVlKSB7XG4gICAgICAgICAgICBvcHRpb25zLl9jYWNoZUJ1c3QgPSBmcC51dGlsLmdldElkKCk7XG4gICAgICAgIH1cbiAgICAgICAgZnAuYWpheC5nZXQodXJsLCB7XG4gICAgICAgICAgICBkYXRhOiBvcHRpb25zLFxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIFwiWC1OTy1TVFJFQU1cIjogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IG9uU3VjY2VzcyxcbiAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbihtc2csIHN0YXR1cywgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1zZyA9PT0gXCJDT1JTX25vdF9hbGxvd2VkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTEzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwiQ09SU19lcnJvclwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDExNCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDExNSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcig0MDApKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfYXV0aG9yaXplZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDExOCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9ncmVzczogb25Qcm9ncmVzc1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHZhciByZWFkRnJvbUZpbGUgPSBmdW5jdGlvbihmaWxlLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgaWYgKCEod2luZG93LkZpbGUgJiYgd2luZG93LkZpbGVSZWFkZXIgJiYgd2luZG93LkZpbGVMaXN0ICYmIHdpbmRvdy5CbG9iKSkge1xuICAgICAgICAgICAgb25Qcm9ncmVzcygxMCk7XG4gICAgICAgICAgICBmcC5maWxlcy5zdG9yZUZpbGUoZmlsZSwge30sIGZ1bmN0aW9uKGZwZmlsZSkge1xuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MoNTApO1xuICAgICAgICAgICAgICAgIGZwLmZpbGVzLnJlYWRGcm9tRlBVcmwoZnBmaWxlLnVybCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAgICAgICAgICAgICAgICBvblByb2dyZXNzKDUwICsgcHJvZ3Jlc3MgLyAyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIG9uRXJyb3IsIGZ1bmN0aW9uKHByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgb25Qcm9ncmVzcyhwcm9ncmVzcyAvIDIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJhc2U2NGVuY29kZSA9ICEhb3B0aW9ucy5iYXNlNjRlbmNvZGU7XG4gICAgICAgIHZhciBhc1RleHQgPSAhIW9wdGlvbnMuYXNUZXh0O1xuICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgcmVhZGVyLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIGlmIChldnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MoTWF0aC5yb3VuZChldnQubG9hZGVkIC8gZXZ0LnRvdGFsICogMTAwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MoMTAwKTtcbiAgICAgICAgICAgIGlmIChiYXNlNjRlbmNvZGUpIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoZnAuYmFzZTY0LmVuY29kZShldnQudGFyZ2V0LnJlc3VsdCwgYXNUZXh0KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhldnQudGFyZ2V0LnJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGV2dC50YXJnZXQuZXJyb3IuY29kZSkge1xuICAgICAgICAgICAgICBjYXNlIGV2dC50YXJnZXQuZXJyb3IuTk9UX0ZPVU5EX0VSUjpcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMTUpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjYXNlIGV2dC50YXJnZXQuZXJyb3IuTk9UX1JFQURBQkxFX0VSUjpcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMTYpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjYXNlIGV2dC50YXJnZXQuZXJyb3IuQUJPUlRfRVJSOlxuICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDExNykpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTE4KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChhc1RleHQgfHwgIXJlYWRlci5yZWFkQXNCaW5hcnlTdHJpbmcpIHtcbiAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVhZGVyLnJlYWRBc0JpbmFyeVN0cmluZyhmaWxlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIHdyaXRlRGF0YVRvRlBVcmwgPSBmdW5jdGlvbihmcF91cmwsIGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgdmFyIG1pbWV0eXBlID0gb3B0aW9ucy5taW1ldHlwZSB8fCBcInRleHQvcGxhaW5cIjtcbiAgICAgICAgZnAuYWpheC5wb3N0KGZwLnVybHMuY29uc3RydWN0V3JpdGVVcmwoZnBfdXJsLCBvcHRpb25zKSwge1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IG1pbWV0eXBlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGF0YTogaW5wdXQsXG4gICAgICAgICAgICBwcm9jZXNzRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBqc29uOiB0cnVlLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhmcC51dGlsLnN0YW5kYXJkaXplRlBGaWxlKGpzb24pKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24obXNnLCBzdGF0dXMsIHhocikge1xuICAgICAgICAgICAgICAgIGlmIChtc2cgPT09IFwibm90X2ZvdW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIxKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwiYmFkX3BhcmFtc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMikpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9hdXRob3JpemVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoNDAzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2dyZXNzOiBvblByb2dyZXNzXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgdmFyIHdyaXRlRmlsZUlucHV0VG9GUFVybCA9IGZ1bmN0aW9uKGZwX3VybCwgaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICB2YXIgZXJyb3IgPSBmdW5jdGlvbihtc2csIHN0YXR1cywgeGhyKSB7XG4gICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIxKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJiYWRfcGFyYW1zXCIpIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjIpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9hdXRob3JpemVkXCIpIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcig0MDMpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZhciBzdWNjZXNzID0gZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgb25TdWNjZXNzKGZwLnV0aWwuc3RhbmRhcmRpemVGUEZpbGUoanNvbikpO1xuICAgICAgICB9O1xuICAgICAgICB1cGxvYWRGaWxlKGlucHV0LCBmcC51cmxzLmNvbnN0cnVjdFdyaXRlVXJsKGZwX3VybCwgb3B0aW9ucyksIHN1Y2Nlc3MsIGVycm9yLCBvblByb2dyZXNzKTtcbiAgICB9O1xuICAgIHZhciB3cml0ZUZpbGVUb0ZQVXJsID0gZnVuY3Rpb24oZnBfdXJsLCBpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIHZhciBlcnJvciA9IGZ1bmN0aW9uKG1zZywgc3RhdHVzLCB4aHIpIHtcbiAgICAgICAgICAgIGlmIChtc2cgPT09IFwibm90X2ZvdW5kXCIpIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjEpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMikpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwibm90X2F1dGhvcml6ZWRcIikge1xuICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHN1Y2Nlc3MgPSBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICBvblN1Y2Nlc3MoZnAudXRpbC5zdGFuZGFyZGl6ZUZQRmlsZShqc29uKSk7XG4gICAgICAgIH07XG4gICAgICAgIG9wdGlvbnMubWltZXR5cGUgPSBpbnB1dC50eXBlO1xuICAgICAgICB1cGxvYWRGaWxlKGlucHV0LCBmcC51cmxzLmNvbnN0cnVjdFdyaXRlVXJsKGZwX3VybCwgb3B0aW9ucyksIHN1Y2Nlc3MsIGVycm9yLCBvblByb2dyZXNzKTtcbiAgICB9O1xuICAgIHZhciB3cml0ZVVybFRvRlBVcmwgPSBmdW5jdGlvbihmcF91cmwsIGlucHV0LCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgZnAuYWpheC5wb3N0KGZwLnVybHMuY29uc3RydWN0V3JpdGVVcmwoZnBfdXJsLCBvcHRpb25zKSwge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHVybDogaW5wdXRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBqc29uOiB0cnVlLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhmcC51dGlsLnN0YW5kYXJkaXplRlBGaWxlKGpzb24pKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24obXNnLCBzdGF0dXMsIHhocikge1xuICAgICAgICAgICAgICAgIGlmIChtc2cgPT09IFwibm90X2ZvdW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIxKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwiYmFkX3BhcmFtc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMikpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9hdXRob3JpemVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoNDAzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2dyZXNzOiBvblByb2dyZXNzXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgdmFyIHN0b3JlRmlsZUlucHV0ID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBpZiAoaW5wdXQuZmlsZXMpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dC5maWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMTUpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RvcmVGaWxlKGlucHV0LmZpbGVzWzBdLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZwLnV0aWwuc2V0RGVmYXVsdChvcHRpb25zLCBcImxvY2F0aW9uXCIsIFwiUzNcIik7XG4gICAgICAgIGlmICghb3B0aW9ucy5maWxlbmFtZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5maWxlbmFtZSA9IGlucHV0LnZhbHVlLnJlcGxhY2UoXCJDOlxcXFxmYWtlcGF0aFxcXFxcIiwgXCJcIikgfHwgaW5wdXQubmFtZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgb2xkX25hbWUgPSBpbnB1dC5uYW1lO1xuICAgICAgICBpbnB1dC5uYW1lID0gXCJmaWxlVXBsb2FkXCI7XG4gICAgICAgIGZwLmlmcmFtZUFqYXgucG9zdChmcC51cmxzLmNvbnN0cnVjdFN0b3JlVXJsKG9wdGlvbnMpLCB7XG4gICAgICAgICAgICBkYXRhOiBpbnB1dCxcbiAgICAgICAgICAgIHByb2Nlc3NEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgIGpzb246IHRydWUsXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQubmFtZSA9IG9sZF9uYW1lO1xuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhmcC51dGlsLnN0YW5kYXJkaXplRlBGaWxlKGpzb24pKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24obXNnLCBzdGF0dXMsIHhocikge1xuICAgICAgICAgICAgICAgIGlmIChtc2cgPT09IFwibm90X2ZvdW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIxKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwiYmFkX3BhcmFtc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMikpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9hdXRob3JpemVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoNDAzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHZhciBzdG9yZUZpbGUgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGZwLnV0aWwuc2V0RGVmYXVsdChvcHRpb25zLCBcImxvY2F0aW9uXCIsIFwiUzNcIik7XG4gICAgICAgIHZhciBlcnJvciA9IGZ1bmN0aW9uKG1zZywgc3RhdHVzLCB4aHIpIHtcbiAgICAgICAgICAgIGlmIChtc2cgPT09IFwibm90X2ZvdW5kXCIpIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjEpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMikpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwibm90X2F1dGhvcml6ZWRcIikge1xuICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmcC51dGlsLmNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcigxMjMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHN1Y2Nlc3MgPSBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICBvblN1Y2Nlc3MoZnAudXRpbC5zdGFuZGFyZGl6ZUZQRmlsZShqc29uKSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICghb3B0aW9ucy5maWxlbmFtZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5maWxlbmFtZSA9IGlucHV0Lm5hbWUgfHwgaW5wdXQuZmlsZU5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgdXBsb2FkRmlsZShpbnB1dCwgZnAudXJscy5jb25zdHJ1Y3RTdG9yZVVybChvcHRpb25zKSwgc3VjY2VzcywgZXJyb3IsIG9uUHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdmFyIHVwbG9hZEZpbGUgPSBmdW5jdGlvbihmaWxlLCB1cmwsIHN1Y2Nlc3MsIGVycm9yLCBwcm9ncmVzcykge1xuICAgICAgICBpZiAoZmlsZS5maWxlcykge1xuICAgICAgICAgICAgZmlsZSA9IGZpbGUuZmlsZXNbMF07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGh0bWw1VXBsb2FkID0gISF3aW5kb3cuRm9ybURhdGEgJiYgISF3aW5kb3cuWE1MSHR0cFJlcXVlc3Q7XG4gICAgICAgIGlmIChodG1sNVVwbG9hZCkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSBuZXcgd2luZG93LkZvcm1EYXRhKCk7XG4gICAgICAgICAgICBkYXRhLmFwcGVuZChcImZpbGVVcGxvYWRcIiwgZmlsZSk7XG4gICAgICAgICAgICBmcC5hamF4LnBvc3QodXJsLCB7XG4gICAgICAgICAgICAgICAganNvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwcm9jZXNzRGF0YTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBzdWNjZXNzLFxuICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvcixcbiAgICAgICAgICAgICAgICBwcm9ncmVzczogcHJvZ3Jlc3NcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnAuaWZyYW1lQWpheC5wb3N0KHVybCwge1xuICAgICAgICAgICAgICAgIGRhdGE6IGZpbGUsXG4gICAgICAgICAgICAgICAganNvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBzdWNjZXNzLFxuICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvclxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBzdG9yZURhdGEgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucywgb25TdWNjZXNzLCBvbkVycm9yLCBvblByb2dyZXNzKSB7XG4gICAgICAgIGZwLnV0aWwuc2V0RGVmYXVsdChvcHRpb25zLCBcImxvY2F0aW9uXCIsIFwiUzNcIik7XG4gICAgICAgIGZwLnV0aWwuc2V0RGVmYXVsdChvcHRpb25zLCBcIm1pbWV0eXBlXCIsIFwidGV4dC9wbGFpblwiKTtcbiAgICAgICAgZnAuYWpheC5wb3N0KGZwLnVybHMuY29uc3RydWN0U3RvcmVVcmwob3B0aW9ucyksIHtcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBvcHRpb25zLm1pbWV0eXBlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGF0YTogaW5wdXQsXG4gICAgICAgICAgICBwcm9jZXNzRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBqc29uOiB0cnVlLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhmcC51dGlsLnN0YW5kYXJkaXplRlBGaWxlKGpzb24pKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24obXNnLCBzdGF0dXMsIHhocikge1xuICAgICAgICAgICAgICAgIGlmIChtc2cgPT09IFwibm90X2ZvdW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIxKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwiYmFkX3BhcmFtc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDEyMikpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9hdXRob3JpemVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoNDAzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTIzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2dyZXNzOiBvblByb2dyZXNzXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgdmFyIHN0b3JlVXJsID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvciwgb25Qcm9ncmVzcykge1xuICAgICAgICBmcC51dGlsLnNldERlZmF1bHQob3B0aW9ucywgXCJsb2NhdGlvblwiLCBcIlMzXCIpO1xuICAgICAgICBmcC5hamF4LnBvc3QoZnAudXJscy5jb25zdHJ1Y3RTdG9yZVVybChvcHRpb25zKSwge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHVybDogZnAudXRpbC5nZXRGUFVybChpbnB1dClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBqc29uOiB0cnVlLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhmcC51dGlsLnN0YW5kYXJkaXplRlBGaWxlKGpzb24pKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24obXNnLCBzdGF0dXMsIHhocikge1xuICAgICAgICAgICAgICAgIGlmIChtc2cgPT09IFwibm90X2ZvdW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTUxKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwiYmFkX3BhcmFtc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDE1MikpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9hdXRob3JpemVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoNDAzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTUzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2dyZXNzOiBvblByb2dyZXNzXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgdmFyIHN0YXQgPSBmdW5jdGlvbihmcF91cmwsIG9wdGlvbnMsIG9uU3VjY2Vzcywgb25FcnJvcikge1xuICAgICAgICB2YXIgZGF0ZXBhcmFtcyA9IFsgXCJ1cGxvYWRlZFwiLCBcIm1vZGlmaWVkXCIsIFwiY3JlYXRlZFwiIF07XG4gICAgICAgIGlmIChvcHRpb25zLmNhY2hlICE9PSB0cnVlKSB7XG4gICAgICAgICAgICBvcHRpb25zLl9jYWNoZUJ1c3QgPSBmcC51dGlsLmdldElkKCk7XG4gICAgICAgIH1cbiAgICAgICAgZnAuYWpheC5nZXQoZnBfdXJsICsgXCIvbWV0YWRhdGFcIiwge1xuICAgICAgICAgICAganNvbjogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMsXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihtZXRhZGF0YSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0ZXBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobWV0YWRhdGFbZGF0ZXBhcmFtc1tpXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhW2RhdGVwYXJhbXNbaV1dID0gbmV3IERhdGUobWV0YWRhdGFbZGF0ZXBhcmFtc1tpXV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhtZXRhZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKG1zZywgc3RhdHVzLCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAobXNnID09PSBcIm5vdF9mb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDE2MSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcImJhZF9wYXJhbXNcIikge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKG5ldyBmcC5lcnJvcnMuRlBFcnJvcig0MDApKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1zZyA9PT0gXCJub3RfYXV0aG9yaXplZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDE2MikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICB2YXIgcmVtb3ZlID0gZnVuY3Rpb24oZnBfdXJsLCBvcHRpb25zLCBvblN1Y2Nlc3MsIG9uRXJyb3IpIHtcbiAgICAgICAgb3B0aW9ucy5rZXkgPSBmcC5hcGlrZXk7XG4gICAgICAgIGZwLmFqYXgucG9zdChmcF91cmwgKyBcIi9yZW1vdmVcIiwge1xuICAgICAgICAgICAgZGF0YTogb3B0aW9ucyxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24obXNnLCBzdGF0dXMsIHhocikge1xuICAgICAgICAgICAgICAgIGlmIChtc2cgPT09IFwibm90X2ZvdW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTcxKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cgPT09IFwiYmFkX3BhcmFtc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IobmV3IGZwLmVycm9ycy5GUEVycm9yKDQwMCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnID09PSBcIm5vdF9hdXRob3JpemVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoNDAzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihuZXcgZnAuZXJyb3JzLkZQRXJyb3IoMTcyKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlYWRGcm9tVXJsOiByZWFkRnJvbVVybCxcbiAgICAgICAgcmVhZEZyb21GaWxlOiByZWFkRnJvbUZpbGUsXG4gICAgICAgIHJlYWRGcm9tRlBVcmw6IHJlYWRGcm9tRlBVcmwsXG4gICAgICAgIHdyaXRlRGF0YVRvRlBVcmw6IHdyaXRlRGF0YVRvRlBVcmwsXG4gICAgICAgIHdyaXRlRmlsZVRvRlBVcmw6IHdyaXRlRmlsZVRvRlBVcmwsXG4gICAgICAgIHdyaXRlRmlsZUlucHV0VG9GUFVybDogd3JpdGVGaWxlSW5wdXRUb0ZQVXJsLFxuICAgICAgICB3cml0ZVVybFRvRlBVcmw6IHdyaXRlVXJsVG9GUFVybCxcbiAgICAgICAgc3RvcmVGaWxlSW5wdXQ6IHN0b3JlRmlsZUlucHV0LFxuICAgICAgICBzdG9yZUZpbGU6IHN0b3JlRmlsZSxcbiAgICAgICAgc3RvcmVVcmw6IHN0b3JlVXJsLFxuICAgICAgICBzdG9yZURhdGE6IHN0b3JlRGF0YSxcbiAgICAgICAgc3RhdDogc3RhdCxcbiAgICAgICAgcmVtb3ZlOiByZW1vdmVcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImlmcmFtZUFqYXhcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgSUZSQU1FX0lEID0gXCJhamF4X2lmcmFtZVwiO1xuICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgIHZhciBydW5uaW5nID0gZmFsc2U7XG4gICAgdmFyIGdldF9yZXF1ZXN0ID0gZnVuY3Rpb24odXJsLCBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMubWV0aG9kID0gXCJHRVRcIjtcbiAgICAgICAgbWFrZV9yZXF1ZXN0KHVybCwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB2YXIgcG9zdF9yZXF1ZXN0ID0gZnVuY3Rpb24odXJsLCBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMubWV0aG9kID0gXCJQT1NUXCI7XG4gICAgICAgIHVybCArPSAodXJsLmluZGV4T2YoXCI/XCIpID49IDAgPyBcIiZcIiA6IFwiP1wiKSArIFwiX2NhY2hlQnVzdD1cIiArIGZwLnV0aWwuZ2V0SWQoKTtcbiAgICAgICAgbWFrZV9yZXF1ZXN0KHVybCwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB2YXIgcnVuUXVldWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgIG1ha2VfcmVxdWVzdChuZXh0LnVybCwgbmV4dC5vcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIG1ha2VfcmVxdWVzdCA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuICAgICAgICBpZiAocnVubmluZykge1xuICAgICAgICAgICAgcXVldWUucHVzaCh7XG4gICAgICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogb3B0aW9uc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdXJsICs9ICh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCA/IFwiJlwiIDogXCI/XCIpICsgXCJwbHVnaW49XCIgKyBmcC51cmxzLmdldFBsdWdpbigpICsgXCImX2NhY2hlQnVzdD1cIiArIGZwLnV0aWwuZ2V0SWQoKTtcbiAgICAgICAgdXJsICs9IFwiJkNvbnRlbnQtVHlwZT10ZXh0JTJGaHRtbFwiO1xuICAgICAgICBmcC5jb21tLm9wZW5DaGFubmVsKCk7XG4gICAgICAgIHZhciB1cGxvYWRJRnJhbWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB1cGxvYWRJRnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCc8aWZyYW1lIG5hbWU9XCInICsgSUZSQU1FX0lEICsgJ1wiPicpO1xuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgICAgdXBsb2FkSUZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgICAgICAgfVxuICAgICAgICB1cGxvYWRJRnJhbWUuaWQgPSB1cGxvYWRJRnJhbWUubmFtZSA9IElGUkFNRV9JRDtcbiAgICAgICAgdXBsb2FkSUZyYW1lLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgdmFyIHJlbGVhc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHVwbG9hZElGcmFtZS5hdHRhY2hFdmVudCkge1xuICAgICAgICAgICAgdXBsb2FkSUZyYW1lLmF0dGFjaEV2ZW50KFwib25sb2FkXCIsIHJlbGVhc2UpO1xuICAgICAgICAgICAgdXBsb2FkSUZyYW1lLmF0dGFjaEV2ZW50KFwib25lcnJvclwiLCByZWxlYXNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVwbG9hZElGcmFtZS5vbmVycm9yID0gdXBsb2FkSUZyYW1lLm9ubG9hZCA9IHJlbGVhc2U7XG4gICAgICAgIH1cbiAgICAgICAgdXBsb2FkSUZyYW1lLmlkID0gSUZSQU1FX0lEO1xuICAgICAgICB1cGxvYWRJRnJhbWUubmFtZSA9IElGUkFNRV9JRDtcbiAgICAgICAgdXBsb2FkSUZyYW1lLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgdXBsb2FkSUZyYW1lLm9uZXJyb3IgPSB1cGxvYWRJRnJhbWUub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIH07XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodXBsb2FkSUZyYW1lKTtcbiAgICAgICAgZnAuaGFuZGxlcnMuYXR0YWNoKFwidXBsb2FkXCIsIGdldFJlY2VpdmVVcGxvYWRNZXNzYWdlKG9wdGlvbnMpKTtcbiAgICAgICAgdmFyIGZvcm0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZm9ybVwiKTtcbiAgICAgICAgZm9ybS5tZXRob2QgPSBvcHRpb25zLm1ldGhvZCB8fCBcIkdFVFwiO1xuICAgICAgICBmb3JtLmFjdGlvbiA9IHVybDtcbiAgICAgICAgZm9ybS50YXJnZXQgPSBJRlJBTUVfSUQ7XG4gICAgICAgIHZhciBkYXRhID0gb3B0aW9ucy5kYXRhO1xuICAgICAgICBpZiAoZnAudXRpbC5pc0ZpbGVJbnB1dEVsZW1lbnQoZGF0YSkgfHwgZnAudXRpbC5pc0ZpbGUoZGF0YSkpIHtcbiAgICAgICAgICAgIGZvcm0uZW5jb2RpbmcgPSBmb3JtLmVuY3R5cGUgPSBcIm11bHRpcGFydC9mb3JtLWRhdGFcIjtcbiAgICAgICAgfVxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGZvcm0pO1xuICAgICAgICB2YXIgaW5wdXQ7XG4gICAgICAgIGlmIChmcC51dGlsLmlzRmlsZShkYXRhKSkge1xuICAgICAgICAgICAgdmFyIGZpbGVfaW5wdXQgPSBnZXRJbnB1dEZvckZpbGUoZGF0YSk7XG4gICAgICAgICAgICBpZiAoIWZpbGVfaW5wdXQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKFwiQ291bGRuJ3QgZmluZCBjb3JyZXNwb25kaW5nIGZpbGUgaW5wdXQuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBmaWxlVXBsb2FkOiBmaWxlX2lucHV0XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKGZwLnV0aWwuaXNGaWxlSW5wdXRFbGVtZW50KGRhdGEpKSB7XG4gICAgICAgICAgICBpbnB1dCA9IGRhdGE7XG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgICAgICBkYXRhLmZpbGVVcGxvYWQgPSBpbnB1dDtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhICYmIGZwLnV0aWwuaXNFbGVtZW50KGRhdGEpICYmIGRhdGEudGFnTmFtZSA9PT0gXCJJTlBVVFwiKSB7XG4gICAgICAgICAgICBpbnB1dCA9IGRhdGE7XG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgICAgICBkYXRhW2lucHV0Lm5hbWVdID0gaW5wdXQ7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5wcm9jZXNzRGF0YSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBkYXRhLmZvcm1hdCA9IFwiaWZyYW1lXCI7XG4gICAgICAgIHZhciBpbnB1dF9jYWNoZSA9IHt9O1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIHZhbCA9IGRhdGFba2V5XTtcbiAgICAgICAgICAgIGlmIChmcC51dGlsLmlzRWxlbWVudCh2YWwpICYmIHZhbC50YWdOYW1lID09PSBcIklOUFVUXCIpIHtcbiAgICAgICAgICAgICAgICBpbnB1dF9jYWNoZVtrZXldID0ge1xuICAgICAgICAgICAgICAgICAgICBwYXI6IHZhbC5wYXJlbnROb2RlLFxuICAgICAgICAgICAgICAgICAgICBzaWI6IHZhbC5uZXh0U2libGluZyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdmFsLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGlucHV0OiB2YWwsXG4gICAgICAgICAgICAgICAgICAgIGZvY3VzZWQ6IHZhbCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFsLm5hbWUgPSBrZXk7XG4gICAgICAgICAgICAgICAgZm9ybS5hcHBlbmRDaGlsZCh2YWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5wdXRfdmFsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xuICAgICAgICAgICAgICAgIGlucHV0X3ZhbC5uYW1lID0ga2V5O1xuICAgICAgICAgICAgICAgIGlucHV0X3ZhbC52YWx1ZSA9IHZhbDtcbiAgICAgICAgICAgICAgICBmb3JtLmFwcGVuZENoaWxkKGlucHV0X3ZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcnVubmluZyA9IHRydWU7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZm9ybS5zdWJtaXQoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGNhY2hlX2tleSBpbiBpbnB1dF9jYWNoZSkge1xuICAgICAgICAgICAgICAgIHZhciBjYWNoZV92YWwgPSBpbnB1dF9jYWNoZVtjYWNoZV9rZXldO1xuICAgICAgICAgICAgICAgIGNhY2hlX3ZhbC5wYXIuaW5zZXJ0QmVmb3JlKGNhY2hlX3ZhbC5pbnB1dCwgY2FjaGVfdmFsLnNpYik7XG4gICAgICAgICAgICAgICAgY2FjaGVfdmFsLmlucHV0Lm5hbWUgPSBjYWNoZV92YWwubmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoY2FjaGVfdmFsLmZvY3VzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVfdmFsLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9ybS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGZvcm0pO1xuICAgICAgICB9LCAxKTtcbiAgICB9O1xuICAgIHZhciBnZXRSZWNlaXZlVXBsb2FkTWVzc2FnZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3MgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgdmFyIGVycm9yID0gb3B0aW9ucy5lcnJvciB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhLnR5cGUgIT09IFwiVXBsb2FkXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgcmVzcG9uc2UgPSBkYXRhLnBheWxvYWQ7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihyZXNwb25zZS5lcnJvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnAuaGFuZGxlcnMuZGV0YWNoKFwidXBsb2FkXCIpO1xuICAgICAgICAgICAgcnVuUXVldWUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXI7XG4gICAgfTtcbiAgICB2YXIgZ2V0SW5wdXRGb3JGaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICB2YXIgaW5wdXRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnB1dFwiKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbnB1dHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBpbnB1dCA9IGlucHV0c1swXTtcbiAgICAgICAgICAgIGlmIChpbnB1dC50eXBlICE9PSBcImZpbGVcIiB8fCAhaW5wdXQuZmlsZXMgfHwgIWlucHV0LmZpbGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBpbnB1dC5maWxlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5maWxlc1tqXSA9PT0gZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0OiBnZXRfcmVxdWVzdCxcbiAgICAgICAgcG9zdDogcG9zdF9yZXF1ZXN0LFxuICAgICAgICByZXF1ZXN0OiBtYWtlX3JlcXVlc3RcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImJhc2U2NFwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBfa2V5U3RyID0gXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPVwiO1xuICAgIHZhciBlbmNvZGUgPSBmdW5jdGlvbihpbnB1dCwgdXRmOGVuY29kZSkge1xuICAgICAgICB1dGY4ZW5jb2RlID0gdXRmOGVuY29kZSB8fCB1dGY4ZW5jb2RlID09PSB1bmRlZmluZWQ7XG4gICAgICAgIHZhciBvdXRwdXQgPSBcIlwiO1xuICAgICAgICB2YXIgY2hyMSwgY2hyMiwgY2hyMywgZW5jMSwgZW5jMiwgZW5jMywgZW5jNDtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICBpZiAodXRmOGVuY29kZSkge1xuICAgICAgICAgICAgaW5wdXQgPSBfdXRmOF9lbmNvZGUoaW5wdXQpO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChpIDwgaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjaHIxID0gaW5wdXQuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgIGNocjIgPSBpbnB1dC5jaGFyQ29kZUF0KGkgKyAxKTtcbiAgICAgICAgICAgIGNocjMgPSBpbnB1dC5jaGFyQ29kZUF0KGkgKyAyKTtcbiAgICAgICAgICAgIGkgKz0gMztcbiAgICAgICAgICAgIGVuYzEgPSBjaHIxID4+IDI7XG4gICAgICAgICAgICBlbmMyID0gKGNocjEgJiAzKSA8PCA0IHwgY2hyMiA+PiA0O1xuICAgICAgICAgICAgZW5jMyA9IChjaHIyICYgMTUpIDw8IDIgfCBjaHIzID4+IDY7XG4gICAgICAgICAgICBlbmM0ID0gY2hyMyAmIDYzO1xuICAgICAgICAgICAgaWYgKGlzTmFOKGNocjIpKSB7XG4gICAgICAgICAgICAgICAgZW5jMyA9IGVuYzQgPSA2NDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNOYU4oY2hyMykpIHtcbiAgICAgICAgICAgICAgICBlbmM0ID0gNjQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXRwdXQgPSBvdXRwdXQgKyBfa2V5U3RyLmNoYXJBdChlbmMxKSArIF9rZXlTdHIuY2hhckF0KGVuYzIpICsgX2tleVN0ci5jaGFyQXQoZW5jMykgKyBfa2V5U3RyLmNoYXJBdChlbmM0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH07XG4gICAgdmFyIGRlY29kZSA9IGZ1bmN0aW9uKGlucHV0LCB1dGY4ZGVjb2RlKSB7XG4gICAgICAgIHV0ZjhkZWNvZGUgPSB1dGY4ZGVjb2RlIHx8IHV0ZjhkZWNvZGUgPT09IHVuZGVmaW5lZDtcbiAgICAgICAgdmFyIG91dHB1dCA9IFwiXCI7XG4gICAgICAgIHZhciBjaHIxLCBjaHIyLCBjaHIzO1xuICAgICAgICB2YXIgZW5jMSwgZW5jMiwgZW5jMywgZW5jNDtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICBpbnB1dCA9IGlucHV0LnJlcGxhY2UoL1teQS1aYS16MC05XFwrXFwvXFw9XS9nLCBcIlwiKTtcbiAgICAgICAgd2hpbGUgKGkgPCBpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGVuYzEgPSBfa2V5U3RyLmluZGV4T2YoaW5wdXQuY2hhckF0KGkpKTtcbiAgICAgICAgICAgIGVuYzIgPSBfa2V5U3RyLmluZGV4T2YoaW5wdXQuY2hhckF0KGkgKyAxKSk7XG4gICAgICAgICAgICBlbmMzID0gX2tleVN0ci5pbmRleE9mKGlucHV0LmNoYXJBdChpICsgMikpO1xuICAgICAgICAgICAgZW5jNCA9IF9rZXlTdHIuaW5kZXhPZihpbnB1dC5jaGFyQXQoaSArIDMpKTtcbiAgICAgICAgICAgIGkgKz0gNDtcbiAgICAgICAgICAgIGNocjEgPSBlbmMxIDw8IDIgfCBlbmMyID4+IDQ7XG4gICAgICAgICAgICBjaHIyID0gKGVuYzIgJiAxNSkgPDwgNCB8IGVuYzMgPj4gMjtcbiAgICAgICAgICAgIGNocjMgPSAoZW5jMyAmIDMpIDw8IDYgfCBlbmM0O1xuICAgICAgICAgICAgb3V0cHV0ID0gb3V0cHV0ICsgU3RyaW5nLmZyb21DaGFyQ29kZShjaHIxKTtcbiAgICAgICAgICAgIGlmIChlbmMzICE9IDY0KSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gb3V0cHV0ICsgU3RyaW5nLmZyb21DaGFyQ29kZShjaHIyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlbmM0ICE9IDY0KSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gb3V0cHV0ICsgU3RyaW5nLmZyb21DaGFyQ29kZShjaHIzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodXRmOGRlY29kZSkge1xuICAgICAgICAgICAgb3V0cHV0ID0gX3V0ZjhfZGVjb2RlKG91dHB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9O1xuICAgIHZhciBfdXRmOF9lbmNvZGUgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UoL1xcclxcbi9nLCBcIlxcblwiKTtcbiAgICAgICAgdmFyIHV0ZnRleHQgPSBcIlwiO1xuICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IHN0cmluZy5sZW5ndGg7IG4rKykge1xuICAgICAgICAgICAgdmFyIGMgPSBzdHJpbmcuY2hhckNvZGVBdChuKTtcbiAgICAgICAgICAgIGlmIChjIDwgMTI4KSB7XG4gICAgICAgICAgICAgICAgdXRmdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjID4gMTI3ICYmIGMgPCAyMDQ4KSB7XG4gICAgICAgICAgICAgICAgdXRmdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgPj4gNiB8IDE5Mik7XG4gICAgICAgICAgICAgICAgdXRmdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgJiA2MyB8IDEyOCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHV0ZnRleHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjID4+IDEyIHwgMjI0KTtcbiAgICAgICAgICAgICAgICB1dGZ0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyA+PiA2ICYgNjMgfCAxMjgpO1xuICAgICAgICAgICAgICAgIHV0ZnRleHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjICYgNjMgfCAxMjgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1dGZ0ZXh0O1xuICAgIH07XG4gICAgdmFyIF91dGY4X2RlY29kZSA9IGZ1bmN0aW9uKHV0ZnRleHQpIHtcbiAgICAgICAgdmFyIHN0cmluZyA9IFwiXCIsIGkgPSAwLCBjID0gMCwgYzIgPSAwLCBjMyA9IDA7XG4gICAgICAgIHdoaWxlIChpIDwgdXRmdGV4dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGMgPSB1dGZ0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICBpZiAoYyA8IDEyOCkge1xuICAgICAgICAgICAgICAgIHN0cmluZyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYyA+IDE5MSAmJiBjIDwgMjI0KSB7XG4gICAgICAgICAgICAgICAgYzIgPSB1dGZ0ZXh0LmNoYXJDb2RlQXQoaSArIDEpO1xuICAgICAgICAgICAgICAgIHN0cmluZyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjICYgMzEpIDw8IDYgfCBjMiAmIDYzKTtcbiAgICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGMyID0gdXRmdGV4dC5jaGFyQ29kZUF0KGkgKyAxKTtcbiAgICAgICAgICAgICAgICBjMyA9IHV0ZnRleHQuY2hhckNvZGVBdChpICsgMik7XG4gICAgICAgICAgICAgICAgc3RyaW5nICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGMgJiAxNSkgPDwgMTIgfCAoYzIgJiA2MykgPDwgNiB8IGMzICYgNjMpO1xuICAgICAgICAgICAgICAgIGkgKz0gMztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZW5jb2RlOiBlbmNvZGUsXG4gICAgICAgIGRlY29kZTogZGVjb2RlXG4gICAgfTtcbn0sIHRydWUpO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJicm93c2VyXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIGlzSU9TID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAhIShuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUGhvbmUvaSkgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBvZC9pKSB8fCBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUGFkL2kpKTtcbiAgICB9O1xuICAgIHZhciBpc0FuZHJvaWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICEhbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQW5kcm9pZC9pKTtcbiAgICB9O1xuICAgIHZhciBnZXRMYW5ndWFnZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbGFuZ3VhZ2UgPSB3aW5kb3cubmF2aWdhdG9yLnVzZXJMYW5ndWFnZSB8fCB3aW5kb3cubmF2aWdhdG9yLmxhbmd1YWdlO1xuICAgICAgICBpZiAobGFuZ3VhZ2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGFuZ3VhZ2UgPSBcImVuXCI7XG4gICAgICAgIH1cbiAgICAgICAgbGFuZ3VhZ2UgPSBsYW5ndWFnZS5yZXBsYWNlKFwiLVwiLCBcIl9cIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcmV0dXJuIGxhbmd1YWdlO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0TGFuZ3VhZ2U6IGdldExhbmd1YWdlLFxuICAgICAgICBvcGVuSW5Nb2RhbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gIShpc0lPUygpIHx8IGlzQW5kcm9pZCgpKSB8fCAhIXdpbmRvdy5uYXZpZ2F0b3Iuc3RhbmRhbG9uZTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNNb2JpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGlzSU9TKCkgfHwgaXNBbmRyb2lkKCk7XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImNvbnZlcnNpb25zVXRpbFwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzLCBDT05WRVJTSU9OX0RPTUFJTiA9IGZwLnVybHMuQkFTRS5yZXBsYWNlKFwid3d3XCIsIFwicHJvY2Vzc1wiKSArIFwiL1wiO1xuICAgIHZhciBwYXJzZUNvbnZlcnNpb25VcmwgPSBmdW5jdGlvbihwcm9jZXNzVXJsKSB7XG4gICAgICAgIGlmICghcHJvY2Vzc1VybCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB1cmw6IG51bGwsXG4gICAgICAgICAgICAgICAgb3B0aW9uc0RpY3Q6IHt9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3NVcmwgPSBwcm9jZXNzVXJsLnJlcGxhY2UoQ09OVkVSU0lPTl9ET01BSU4sIFwiXCIpO1xuICAgICAgICB2YXIgb3JpZ2luYWxVcmwgPSBwcm9jZXNzVXJsLnN1YnN0cmluZyhwcm9jZXNzVXJsLmluZGV4T2YoXCIvaHR0cFwiKSArIDEpO1xuICAgICAgICBwcm9jZXNzVXJsID0gcHJvY2Vzc1VybC5yZXBsYWNlKFwiL1wiICsgb3JpZ2luYWxVcmwsIFwiXCIpO1xuICAgICAgICB2YXIgYXBpa2V5ID0gcHJvY2Vzc1VybC5zdWJzdHJpbmcoMCwgcHJvY2Vzc1VybC5pbmRleE9mKFwiL1wiKSk7XG4gICAgICAgIHByb2Nlc3NVcmwgPSBwcm9jZXNzVXJsLnJlcGxhY2UoYXBpa2V5ICsgXCIvXCIsIFwiXCIpO1xuICAgICAgICB2YXIgc2VnbWVudHMgPSBwcm9jZXNzVXJsLnNwbGl0KFwiL1wiKSwgb3B0aW9uc0RpY3QgPSB7fSwgbWFqb3JPcHRpb24sIG1pbm9yT3B0aW9ucywgbWlub3JPcHRpb24sIGksIGo7XG4gICAgICAgIGZvciAoaSBpbiBzZWdtZW50cykge1xuICAgICAgICAgICAgbWFqb3JPcHRpb24gPSBzZWdtZW50c1tpXS5zcGxpdChcIj1cIik7XG4gICAgICAgICAgICBpZiAobWFqb3JPcHRpb24ubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnNEaWN0W21ham9yT3B0aW9uWzBdXSA9IHt9O1xuICAgICAgICAgICAgICAgIG1pbm9yT3B0aW9ucyA9IG1ham9yT3B0aW9uWzFdLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgICAgICBmb3IgKGogaW4gbWlub3JPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pbm9yT3B0aW9uID0gbWlub3JPcHRpb25zW2pdLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1pbm9yT3B0aW9uLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnNEaWN0W21ham9yT3B0aW9uWzBdXVttaW5vck9wdGlvblswXV0gPSBtaW5vck9wdGlvblsxXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2VnbWVudHNbaV0pIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zRGljdFtzZWdtZW50c1tpXV0gPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB1cmw6IG9yaWdpbmFsVXJsLFxuICAgICAgICAgICAgYXBpa2V5OiBhcGlrZXksXG4gICAgICAgICAgICBvcHRpb25zRGljdDogb3B0aW9uc0RpY3RcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBidWlsZENvbnZlcnNpb25VcmwgPSBmdW5jdGlvbihvcmlnaW5hbFVybCwgb3B0aW9uc0RpY3QsIGFwaWtleSkge1xuICAgICAgICB2YXIgY29udmVyc2lvblVybCA9IENPTlZFUlNJT05fRE9NQUlOICsgYXBpa2V5LCBtYWpvck9wdGlvbiwgbWlub3JPcHRpb24sIGxlbmd0aDtcbiAgICAgICAgb3B0aW9uc0RpY3QgPSBvcHRpb25zRGljdCB8fCB7fTtcbiAgICAgICAgZm9yIChtYWpvck9wdGlvbiBpbiBvcHRpb25zRGljdCkge1xuICAgICAgICAgICAgY29udmVyc2lvblVybCArPSBcIi9cIiArIG1ham9yT3B0aW9uO1xuICAgICAgICAgICAgbGVuZ3RoID0gZnAudXRpbC5vYmplY3RLZXlzKG9wdGlvbnNEaWN0W21ham9yT3B0aW9uXSB8fCB7fSkubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnNpb25VcmwgKz0gXCI9XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKG1pbm9yT3B0aW9uIGluIG9wdGlvbnNEaWN0W21ham9yT3B0aW9uXSkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnNpb25VcmwgKz0gbWlub3JPcHRpb24gKyBcIjpcIiArIG9wdGlvbnNEaWN0W21ham9yT3B0aW9uXVttaW5vck9wdGlvbl07XG4gICAgICAgICAgICAgICAgaWYgKC0tbGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnNpb25VcmwgKz0gXCIsXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnZlcnNpb25VcmwgKz0gXCIvXCIgKyBvcmlnaW5hbFVybDtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnNpb25Vcmw7XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBDT05WRVJTSU9OX0RPTUFJTjogQ09OVkVSU0lPTl9ET01BSU4sXG4gICAgICAgIHBhcnNlVXJsOiBwYXJzZUNvbnZlcnNpb25VcmwsXG4gICAgICAgIGJ1aWxkVXJsOiBidWlsZENvbnZlcnNpb25VcmxcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcImpzb25cIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgc3BlY2lhbCA9IHtcbiAgICAgICAgXCJcXGJcIjogXCJcXFxcYlwiLFxuICAgICAgICBcIlx0XCI6IFwiXFxcXHRcIixcbiAgICAgICAgXCJcXG5cIjogXCJcXFxcblwiLFxuICAgICAgICBcIlxcZlwiOiBcIlxcXFxmXCIsXG4gICAgICAgIFwiXFxyXCI6IFwiXFxcXHJcIixcbiAgICAgICAgJ1wiJzogJ1xcXFxcIicsXG4gICAgICAgIFwiXFxcXFwiOiBcIlxcXFxcXFxcXCJcbiAgICB9O1xuICAgIHZhciBlc2NhcGUgPSBmdW5jdGlvbihjaHIpIHtcbiAgICAgICAgcmV0dXJuIHNwZWNpYWxbY2hyXSB8fCBcIlxcXFx1XCIgKyAoXCIwMDAwXCIgKyBjaHIuY2hhckNvZGVBdCgwKS50b1N0cmluZygxNikpLnNsaWNlKC00KTtcbiAgICB9O1xuICAgIHZhciB2YWxpZGF0ZSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgICBzdHJpbmcgPSBzdHJpbmcucmVwbGFjZSgvXFxcXCg/OltcIlxcXFxcXC9iZm5ydF18dVswLTlhLWZBLUZdezR9KS9nLCBcIkBcIikucmVwbGFjZSgvXCJbXlwiXFxcXFxcblxccl0qXCJ8dHJ1ZXxmYWxzZXxudWxsfC0/XFxkKyg/OlxcLlxcZCopPyg/OltlRV1bK1xcLV0/XFxkKyk/L2csIFwiXVwiKS5yZXBsYWNlKC8oPzpefDp8LCkoPzpcXHMqXFxbKSsvZywgXCJcIik7XG4gICAgICAgIHJldHVybiAvXltcXF0sOnt9XFxzXSokLy50ZXN0KHN0cmluZyk7XG4gICAgfTtcbiAgICB2YXIgZW5jb2RlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmICh3aW5kb3cuSlNPTiAmJiB3aW5kb3cuSlNPTi5zdHJpbmdpZnkpIHtcbiAgICAgICAgICAgIHJldHVybiB3aW5kb3cuSlNPTi5zdHJpbmdpZnkob2JqKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob2JqICYmIG9iai50b0pTT04pIHtcbiAgICAgICAgICAgIG9iaiA9IG9iai50b0pTT04oKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3RyaW5nID0gW107XG4gICAgICAgIHN3aXRjaCAoZnAudXRpbC50eXBlT2Yob2JqKSkge1xuICAgICAgICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgICAgICAgIHJldHVybiAnXCInICsgb2JqLnJlcGxhY2UoL1tcXHgwMC1cXHgxZlxcXFxcIl0vZywgZXNjYXBlKSArICdcIic7XG5cbiAgICAgICAgICBjYXNlIFwiYXJyYXlcIjpcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgc3RyaW5nLnB1c2goZW5jb2RlKG9ialtpXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFwiW1wiICsgc3RyaW5nICsgXCJdXCI7XG5cbiAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgY2FzZSBcImhhc2hcIjpcbiAgICAgICAgICAgIHZhciBqc29uO1xuICAgICAgICAgICAgdmFyIGtleTtcbiAgICAgICAgICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgICAgICAgICAgIGpzb24gPSBlbmNvZGUob2JqW2tleV0pO1xuICAgICAgICAgICAgICAgIGlmIChqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZy5wdXNoKGVuY29kZShrZXkpICsgXCI6XCIgKyBqc29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAganNvbiA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gXCJ7XCIgKyBzdHJpbmcgKyBcIn1cIjtcblxuICAgICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAgICBjYXNlIFwiYm9vbGVhblwiOlxuICAgICAgICAgICAgcmV0dXJuIFwiXCIgKyBvYmo7XG5cbiAgICAgICAgICBjYXNlIFwibnVsbFwiOlxuICAgICAgICAgICAgcmV0dXJuIFwibnVsbFwiO1xuXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuICAgIHZhciBkZWNvZGUgPSBmdW5jdGlvbihzdHJpbmcsIHNlY3VyZSkge1xuICAgICAgICBpZiAoIXN0cmluZyB8fCBmcC51dGlsLnR5cGVPZihzdHJpbmcpICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAod2luZG93LkpTT04gJiYgd2luZG93LkpTT04ucGFyc2UpIHtcbiAgICAgICAgICAgIHJldHVybiB3aW5kb3cuSlNPTi5wYXJzZShzdHJpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHNlY3VyZSkge1xuICAgICAgICAgICAgICAgIGlmICghdmFsaWRhdGUoc3RyaW5nKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJKU09OIGNvdWxkIG5vdCBkZWNvZGUgdGhlIGlucHV0OyBzZWN1cml0eSBpcyBlbmFibGVkIGFuZCB0aGUgdmFsdWUgaXMgbm90IHNlY3VyZS5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGV2YWwoXCIoXCIgKyBzdHJpbmcgKyBcIilcIik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIHZhbGlkYXRlOiB2YWxpZGF0ZSxcbiAgICAgICAgZW5jb2RlOiBlbmNvZGUsXG4gICAgICAgIHN0cmluZ2lmeTogZW5jb2RlLFxuICAgICAgICBkZWNvZGU6IGRlY29kZSxcbiAgICAgICAgcGFyc2U6IGRlY29kZVxuICAgIH07XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwidXRpbFwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciB0cmltID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgXCJcIik7XG4gICAgfTtcbiAgICB2YXIgdHJpbUNvbnZlcnQgPSBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgcmV0dXJuIHVybC5yZXBsYWNlKC9cXC9jb252ZXJ0XFxiLiovLCBcIlwiKTtcbiAgICB9O1xuICAgIHZhciBVUkxfUkVHRVggPSAvXihodHRwfGh0dHBzKVxcOi4qXFwvXFwvL2k7XG4gICAgdmFyIGlzVXJsID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiAhIXN0cmluZy5tYXRjaChVUkxfUkVHRVgpO1xuICAgIH07XG4gICAgdmFyIHBhcnNlVXJsID0gZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIGlmICghdXJsIHx8IHVybC5jaGFyQXQoMCkgPT09IFwiL1wiKSB7XG4gICAgICAgICAgICB1cmwgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIHVybDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICBhLmhyZWYgPSB1cmw7XG4gICAgICAgIHZhciBob3N0ID0gYS5ob3N0bmFtZS5pbmRleE9mKFwiOlwiKSA9PT0gLTEgPyBhLmhvc3RuYW1lIDogYS5ob3N0O1xuICAgICAgICB2YXIgcmV0ID0ge1xuICAgICAgICAgICAgc291cmNlOiB1cmwsXG4gICAgICAgICAgICBwcm90b2NvbDogYS5wcm90b2NvbC5yZXBsYWNlKFwiOlwiLCBcIlwiKSxcbiAgICAgICAgICAgIGhvc3Q6IGhvc3QsXG4gICAgICAgICAgICBwb3J0OiBhLnBvcnQsXG4gICAgICAgICAgICBxdWVyeTogYS5zZWFyY2gsXG4gICAgICAgICAgICBwYXJhbXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSB7fSwgc2VnID0gYS5zZWFyY2gucmVwbGFjZSgvXlxcPy8sIFwiXCIpLnNwbGl0KFwiJlwiKSwgbGVuID0gc2VnLmxlbmd0aCwgaSA9IDAsIHM7XG4gICAgICAgICAgICAgICAgZm9yICg7aSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc2VnW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzID0gc2VnW2ldLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0W3NbMF1dID0gc1sxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH0oKSxcbiAgICAgICAgICAgIGZpbGU6IChhLnBhdGhuYW1lLm1hdGNoKC9cXC8oW15cXC8/I10rKSQvaSkgfHwgWyB1bmRlZmluZWQsIFwiXCIgXSlbMV0sXG4gICAgICAgICAgICBoYXNoOiBhLmhhc2gucmVwbGFjZShcIiNcIiwgXCJcIiksXG4gICAgICAgICAgICBwYXRoOiBhLnBhdGhuYW1lLnJlcGxhY2UoL14oW15cXC9dKS8sIFwiLyQxXCIpLFxuICAgICAgICAgICAgcmVsYXRpdmU6IChhLmhyZWYubWF0Y2goL3Rwcz86XFwvXFwvW15cXC9dKyguKykvKSB8fCBbIHVuZGVmaW5lZCwgXCJcIiBdKVsxXSxcbiAgICAgICAgICAgIHNlZ21lbnRzOiBhLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCBcIlwiKS5zcGxpdChcIi9cIilcbiAgICAgICAgfTtcbiAgICAgICAgcmV0Lm9yaWdpbiA9IHJldC5wcm90b2NvbCArIFwiOi8vXCIgKyByZXQuaG9zdCArIChyZXQucG9ydCA/IFwiOlwiICsgcmV0LnBvcnQgOiBcIlwiKTtcbiAgICAgICAgcmV0LnJhd1VybCA9IChyZXQub3JpZ2luICsgcmV0LnBhdGgpLnJlcGxhY2UoXCIvY29udmVydFwiLCBcIlwiKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIHZhciBlbmRzV2l0aCA9IGZ1bmN0aW9uKHN0ciwgc3VmZml4KSB7XG4gICAgICAgIHJldHVybiBzdHIuaW5kZXhPZihzdWZmaXgsIHN0ci5sZW5ndGggLSBzdWZmaXgubGVuZ3RoKSAhPT0gLTE7XG4gICAgfTtcbiAgICB2YXIgYXBwZW5kUXVlcnlUb1VybCA9IGZ1bmN0aW9uKHVybCwga2V5LCB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdXJsICsgKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwID8gXCImXCIgOiBcIj9cIikgKyBrZXkgKyBcIj1cIiArIHZhbHVlO1xuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHJpbTogdHJpbSxcbiAgICAgICAgdHJpbUNvbnZlcnQ6IHRyaW1Db252ZXJ0LFxuICAgICAgICBwYXJzZVVybDogcGFyc2VVcmwsXG4gICAgICAgIGlzVXJsOiBpc1VybCxcbiAgICAgICAgZW5kc1dpdGg6IGVuZHNXaXRoLFxuICAgICAgICBhcHBlbmRRdWVyeVRvVXJsOiBhcHBlbmRRdWVyeVRvVXJsXG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJ1dGlsXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmcCA9IHRoaXM7XG4gICAgdmFyIGlzQXJyYXkgPSBmdW5jdGlvbihvKSB7XG4gICAgICAgIHJldHVybiBvICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICAgIH07XG4gICAgdmFyIGlzRmlsZSA9IGZ1bmN0aW9uKG8pIHtcbiAgICAgICAgcmV0dXJuIG8gJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pID09PSBcIltvYmplY3QgRmlsZV1cIjtcbiAgICB9O1xuICAgIHZhciBpc0VsZW1lbnQgPSBmdW5jdGlvbihvKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93LkhUTUxFbGVtZW50ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbyBpbnN0YW5jZW9mIHdpbmRvdy5IVE1MRWxlbWVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvICYmIHR5cGVvZiBvID09PSBcIm9iamVjdFwiICYmIG8ubm9kZVR5cGUgPT09IDEgJiYgdHlwZW9mIG8ubm9kZU5hbWUgPT09IFwic3RyaW5nXCI7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBpc0ZpbGVJbnB1dEVsZW1lbnQgPSBmdW5jdGlvbihvKSB7XG4gICAgICAgIHJldHVybiBpc0VsZW1lbnQobykgJiYgby50YWdOYW1lID09PSBcIklOUFVUXCIgJiYgby50eXBlID09PSBcImZpbGVcIjtcbiAgICB9O1xuICAgIHZhciB0eXBlT2YgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYXJyYXlcIjtcbiAgICAgICAgfSBlbHNlIGlmIChpc0ZpbGUodmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJmaWxlXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZTtcbiAgICB9O1xuICAgIHZhciBnZXRJZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIHJldHVybiBkLmdldFRpbWUoKS50b1N0cmluZygpO1xuICAgIH07XG4gICAgdmFyIHNldERlZmF1bHQgPSBmdW5jdGlvbihvYmosIGtleSwgZGVmKSB7XG4gICAgICAgIGlmIChvYmpba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBvYmpba2V5XSA9IGRlZjtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGFkZE9uTG9hZCA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5qUXVlcnkpIHtcbiAgICAgICAgICAgIHdpbmRvdy5qUXVlcnkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgZnVuYygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZXZudCA9IFwibG9hZFwiO1xuICAgICAgICAgICAgaWYgKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoZXZudCwgZnVuYywgZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYXR0YWNoRXZlbnQoXCJvblwiICsgZXZudCwgZnVuYyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh3aW5kb3cub25sb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJyID0gd2luZG93Lm9ubG9hZDtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuYygpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5vbmxvYWQgPSBmdW5jO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGlzRlBVcmwgPSBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgJiYgdXJsLm1hdGNoKGZwLnVybHMuQkFTRSArIFwiL2FwaS9maWxlL1wiKTtcbiAgICB9O1xuICAgIHZhciBpc0ZQVXJsQ2RuID0gZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiICYmIHVybC5tYXRjaChcIi9hcGkvZmlsZS9cIik7XG4gICAgfTtcbiAgICB2YXIgZ2V0RlBVcmwgPSBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0gdXJsLm1hdGNoKC8oPzpjZG4uZmlsZXN0YWNrY29udGVudC5jb218Y2RuLmZpbGVwaWNrZXIuaW8pW1xcU10qXFwvKFtcXFNdezIwLH0pLyk7XG4gICAgICAgICAgICBpZiAobWF0Y2hlZCAmJiBtYXRjaGVkLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnAudXJscy5CQVNFICsgXCIvYXBpL2ZpbGUvXCIgKyBtYXRjaGVkWzFdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfTtcbiAgICB2YXIgY29uc29sZVdyYXAgPSBmdW5jdGlvbihmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAod2luZG93LmNvbnNvbGUgJiYgdHlwZW9mIHdpbmRvdy5jb25zb2xlW2ZuXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmNvbnNvbGVbZm5dLmFwcGx5KHdpbmRvdy5jb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmFsZXJ0KEFycmF5LnByb3RvdHlwZS5qb2luLmNhbGwoYXJndW1lbnRzLCBcIixcIikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBjb25zb2xlID0ge307XG4gICAgY29uc29sZS5sb2cgPSBjb25zb2xlV3JhcChcImxvZ1wiKTtcbiAgICBjb25zb2xlLmVycm9yID0gY29uc29sZVdyYXAoXCJlcnJvclwiKTtcbiAgICB2YXIgY2xvbmUgPSBmdW5jdGlvbihvKSB7XG4gICAgICAgIHZhciByZXQgPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG8pIHtcbiAgICAgICAgICAgIHJldFtrZXldID0gb1trZXldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICB2YXIgc3RhbmRhcmRpemVGUEZpbGUgPSBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIHZhciBmcGZpbGUgPSB7fTtcbiAgICAgICAgZnBmaWxlLnVybCA9IGpzb24udXJsO1xuICAgICAgICBmcGZpbGUuZmlsZW5hbWUgPSBqc29uLmZpbGVuYW1lIHx8IGpzb24ubmFtZTtcbiAgICAgICAgZnBmaWxlLm1pbWV0eXBlID0ganNvbi5taW1ldHlwZSB8fCBqc29uLnR5cGU7XG4gICAgICAgIGZwZmlsZS5zaXplID0ganNvbi5zaXplO1xuICAgICAgICBmcGZpbGUua2V5ID0ganNvbi5rZXkgfHwganNvbi5zM19rZXk7XG4gICAgICAgIGZwZmlsZS5pc1dyaXRlYWJsZSA9ICEhKGpzb24uaXNXcml0ZWFibGUgfHwganNvbi53cml0ZWFibGUpO1xuICAgICAgICByZXR1cm4gZnBmaWxlO1xuICAgIH07XG4gICAgdmFyIGlzQ2FudmFzU3VwcG9ydGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG4gICAgICAgICAgICByZXR1cm4gISEoZWxlbS5nZXRDb250ZXh0ICYmIGVsZW0uZ2V0Q29udGV4dChcIjJkXCIpKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBleHRlbmQgPSBmdW5jdGlvbihvYmoxLCBvYmoyKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gb2JqMSkge1xuICAgICAgICAgICAgaWYgKG9iajEuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgICAgICBvYmoyW2ldID0gb2JqMVtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqMjtcbiAgICB9O1xuICAgIHZhciBjaGVja0FwaUtleSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoIWZwLmFwaWtleSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJBUEkgS2V5IG5vdCBmb3VuZFwiKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIG9iamVjdEtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgaWYgKHR5cGVvZiBPYmplY3Qua2V5cyAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgICAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIG9iaikge1xuICAgICAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goaSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICAgIGlzQXJyYXk6IGlzQXJyYXksXG4gICAgICAgIGlzRmlsZTogaXNGaWxlLFxuICAgICAgICBpc0VsZW1lbnQ6IGlzRWxlbWVudCxcbiAgICAgICAgaXNGaWxlSW5wdXRFbGVtZW50OiBpc0ZpbGVJbnB1dEVsZW1lbnQsXG4gICAgICAgIGdldElkOiBnZXRJZCxcbiAgICAgICAgc2V0RGVmYXVsdDogc2V0RGVmYXVsdCxcbiAgICAgICAgdHlwZU9mOiB0eXBlT2YsXG4gICAgICAgIGFkZE9uTG9hZDogYWRkT25Mb2FkLFxuICAgICAgICBpc0ZQVXJsOiBpc0ZQVXJsLFxuICAgICAgICBnZXRGUFVybDogZ2V0RlBVcmwsXG4gICAgICAgIGlzRlBVcmxDZG46IGlzRlBVcmxDZG4sXG4gICAgICAgIGNvbnNvbGU6IGNvbnNvbGUsXG4gICAgICAgIGNsb25lOiBjbG9uZSxcbiAgICAgICAgc3RhbmRhcmRpemVGUEZpbGU6IHN0YW5kYXJkaXplRlBGaWxlLFxuICAgICAgICBpc0NhbnZhc1N1cHBvcnRlZDogaXNDYW52YXNTdXBwb3J0ZWQsXG4gICAgICAgIGV4dGVuZDogZXh0ZW5kLFxuICAgICAgICBjaGVja0FwaUtleTogY2hlY2tBcGlLZXksXG4gICAgICAgIG9iamVjdEtleXM6IG9iamVjdEtleXNcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcIndpbmRvd1V0aWxzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGdldFdpZHRoOiBnZXRXaWR0aCxcbiAgICAgICAgZ2V0SGVpZ2h0OiBnZXRIZWlnaHRcbiAgICB9O1xuICAgIGZ1bmN0aW9uIGdldFdpZHRoKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoIHx8IGRvY3VtZW50LmJvZHkgJiYgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCB8fCAxMDI0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRIZWlnaHQoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IHx8IGRvY3VtZW50LmJvZHkgJiYgZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQgfHwgNzY4O1xuICAgIH1cbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZmlsZXBpY2tlci5leHRlbmQoXCJkcmFnZHJvcFwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBjYW5EcmFnRHJvcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gKCEhd2luZG93LkZpbGVSZWFkZXIgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiU2FmYXJpXCIpID49IDApICYmIFwiZHJhZ2dhYmxlXCIgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XG4gICAgfTtcbiAgICB2YXIgbWFrZURyb3BQYW5lID0gZnVuY3Rpb24oZGl2LCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBlcnIgPSBcIk5vIERPTSBlbGVtZW50IGZvdW5kIHRvIGNyZWF0ZSBkcm9wIHBhbmVcIjtcbiAgICAgICAgaWYgKCFkaXYpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBmcC5GaWxlcGlja2VyRXhjZXB0aW9uKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpdi5qcXVlcnkpIHtcbiAgICAgICAgICAgIGlmIChkaXYubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpdiA9IGRpdlswXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNhbkRyYWdEcm9wKCkpIHtcbiAgICAgICAgICAgIGZwLnV0aWwuY29uc29sZS5lcnJvcihcIllvdXIgYnJvd3NlciBkb2Vzbid0IHN1cHBvcnQgZHJhZy1kcm9wIGZ1bmN0aW9uYWxpdHlcIik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIHZhciBkcmFnRW50ZXIgPSBvcHRpb25zLmRyYWdFbnRlciB8fCBmdW5jdGlvbigpIHt9O1xuICAgICAgICB2YXIgZHJhZ0xlYXZlID0gb3B0aW9ucy5kcmFnTGVhdmUgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgdmFyIG9uU3RhcnQgPSBvcHRpb25zLm9uU3RhcnQgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgdmFyIG9uU3VjY2VzcyA9IG9wdGlvbnMub25TdWNjZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBvbkVycm9yID0gb3B0aW9ucy5vbkVycm9yIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBvblByb2dyZXNzID0gb3B0aW9ucy5vblByb2dyZXNzIHx8IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHZhciBtaW1ldHlwZXMgPSBvcHRpb25zLm1pbWV0eXBlcztcbiAgICAgICAgaWYgKCFtaW1ldHlwZXMpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLm1pbWV0eXBlKSB7XG4gICAgICAgICAgICAgICAgbWltZXR5cGVzID0gWyBvcHRpb25zLm1pbWV0eXBlIF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pbWV0eXBlcyA9IFsgXCIqLypcIiBdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmcC51dGlsLnR5cGVPZihtaW1ldHlwZXMpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBtaW1ldHlwZXMgPSBtaW1ldHlwZXMuc3BsaXQoXCIsXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBleHRlbnNpb25zID0gb3B0aW9ucy5leHRlbnNpb25zO1xuICAgICAgICBpZiAoIWV4dGVuc2lvbnMpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnMgPSBbIG9wdGlvbnMuZXh0ZW5zaW9uIF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZwLnV0aWwudHlwZU9mKGV4dGVuc2lvbnMpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zID0gZXh0ZW5zaW9ucy5yZXBsYWNlKC8gL2csIFwiXCIpLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXh0ZW5zaW9ucykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBleHRlbnNpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc1tpXSA9IGV4dGVuc2lvbnNbaV0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgc3RvcmVfb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGxvY2F0aW9uOiBvcHRpb25zLmxvY2F0aW9uLFxuICAgICAgICAgICAgcGF0aDogb3B0aW9ucy5wYXRoLFxuICAgICAgICAgICAgY29udGFpbmVyOiBvcHRpb25zLmNvbnRhaW5lcixcbiAgICAgICAgICAgIGFjY2Vzczogb3B0aW9ucy5hY2Nlc3MsXG4gICAgICAgICAgICBwb2xpY3k6IG9wdGlvbnMucG9saWN5LFxuICAgICAgICAgICAgc2lnbmF0dXJlOiBvcHRpb25zLnNpZ25hdHVyZVxuICAgICAgICB9O1xuICAgICAgICB2YXIgZW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRpdiAmJiAoZGl2LmdldEF0dHJpYnV0ZShcImRpc2FibGVkXCIpIHx8IFwiZW5hYmxlZFwiKSAhPT0gXCJkaXNhYmxlZFwiO1xuICAgICAgICB9O1xuICAgICAgICBkaXYuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdlbnRlclwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpZiAoZW5hYmxlZCgpKSB7XG4gICAgICAgICAgICAgICAgZHJhZ0VudGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIGRpdi5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2xlYXZlXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGlmIChlbmFibGVkKCkpIHtcbiAgICAgICAgICAgICAgICBkcmFnTGVhdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgZGl2LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gXCJjb3B5XCI7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgZGl2LmFkZEV2ZW50TGlzdGVuZXIoXCJkcm9wXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoIWVuYWJsZWQoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc0ZvbGRlckRyb3BwZWQoZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZmlsZXMgPSBlLmRhdGFUcmFuc2Zlci5maWxlcywgaW1hZ2VTcmMgPSBnZXRJbWFnZVNyY0Ryb3AoZS5kYXRhVHJhbnNmZXIpO1xuICAgICAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHVwbG9hZERyb3BwZWRGaWxlcyhmaWxlcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGltYWdlU3JjKSB7XG4gICAgICAgICAgICAgICAgdXBsb2FkSW1hZ2VTcmMoaW1hZ2VTcmMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvbkVycm9yKFwiTm9GaWxlc0ZvdW5kXCIsIFwiTm8gZmlsZXMgdXBsb2FkZWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcmVlbmFibGVQYW5lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBkaXYuc2V0QXR0cmlidXRlKFwiZGlzYWJsZWRcIiwgXCJlbmFibGVkXCIpO1xuICAgICAgICAgICAgaWYgKHdpbmRvdy4kKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LiQoZGl2KS5wcm9wKFwiZGlzYWJsZWRcIiwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB2YXIgcHJvZ3Jlc3NlcyA9IHt9O1xuICAgICAgICB2YXIgcmVzcG9uc2UgPSBbXTtcbiAgICAgICAgdmFyIGdldFN1Y2Nlc3NIYW5kbGVyID0gZnVuY3Rpb24oaSwgdG90YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihmcGZpbGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKFsgZnBmaWxlIF0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLnB1c2goZnBmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gdG90YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NlcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3Nlc1tpXSA9IDEwMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVByb2dyZXNzKHRvdGFsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWVuYWJsZVBhbmUoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHZhciBlcnJvckhhbmRsZXIgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIG9uRXJyb3IoXCJVcGxvYWRFcnJvclwiLCBlcnIudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICByZWVuYWJsZVBhbmUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGdldFByb2dyZXNzSGFuZGxlciA9IGZ1bmN0aW9uKGksIHRvdGFsKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24ocGVyY2VudCkge1xuICAgICAgICAgICAgICAgIHByb2dyZXNzZXNbaV0gPSBwZXJjZW50O1xuICAgICAgICAgICAgICAgIHVwZGF0ZVByb2dyZXNzKHRvdGFsKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHZhciB1cGRhdGVQcm9ncmVzcyA9IGZ1bmN0aW9uKHRvdGFsQ291bnQpIHtcbiAgICAgICAgICAgIHZhciB0b3RhbFByb2dyZXNzID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcHJvZ3Jlc3Nlcykge1xuICAgICAgICAgICAgICAgIHRvdGFsUHJvZ3Jlc3MgKz0gcHJvZ3Jlc3Nlc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBwZXJjZW50YWdlID0gdG90YWxQcm9ncmVzcyAvIHRvdGFsQ291bnQ7XG4gICAgICAgICAgICBvblByb2dyZXNzKHBlcmNlbnRhZ2UpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgdmVyaWZ5VXBsb2FkID0gZnVuY3Rpb24oZmlsZXMpIHtcbiAgICAgICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDEgJiYgIW9wdGlvbnMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcihcIlRvb01hbnlGaWxlc1wiLCBcIk9ubHkgb25lIGZpbGUgYXQgYSB0aW1lXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm1heEZpbGVzID4gMCAmJiBmaWxlcy5sZW5ndGggPiBvcHRpb25zLm1heEZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IoXCJUb29NYW55RmlsZXNcIiwgXCJPbmx5IFwiICsgb3B0aW9ucy5tYXhGaWxlcyArIFwiIGZpbGVzIGF0IGEgdGltZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgZm91bmQ7XG4gICAgICAgICAgICAgICAgdmFyIGZpbGU7XG4gICAgICAgICAgICAgICAgdmFyIGZpbGVuYW1lO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmlsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZmlsZSA9IGZpbGVzW2ldO1xuICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IGZpbGUubmFtZSB8fCBmaWxlLmZpbGVOYW1lIHx8IFwiVW5rbm93biBmaWxlXCI7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWltZXR5cGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWltZXR5cGUgPSBmcC5taW1ldHlwZXMuZ2V0TWltZXR5cGUoZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IGZvdW5kIHx8IGZwLm1pbWV0eXBlcy5tYXRjaGVzTWltZXR5cGUobWltZXR5cGUsIG1pbWV0eXBlc1tqXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb25FcnJvcihcIldyb25nVHlwZVwiLCBmaWxlbmFtZSArIFwiIGlzbid0IHRoZSByaWdodCB0eXBlIG9mIGZpbGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgZXh0ZW5zaW9ucy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gZm91bmQgfHwgZnAudXRpbC5lbmRzV2l0aChmaWxlbmFtZSwgZXh0ZW5zaW9uc1tqXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25FcnJvcihcIldyb25nVHlwZVwiLCBmaWxlbmFtZSArIFwiIGlzbid0IHRoZSByaWdodCB0eXBlIG9mIGZpbGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWxlLnNpemUgJiYgISFvcHRpb25zLm1heFNpemUgJiYgZmlsZS5zaXplID4gb3B0aW9ucy5tYXhTaXplKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkVycm9yKFwiV3JvbmdTaXplXCIsIGZpbGVuYW1lICsgXCIgaXMgdG9vIGxhcmdlIChcIiArIGZpbGUuc2l6ZSArIFwiIEJ5dGVzKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb25FcnJvcihcIk5vRmlsZXNGb3VuZFwiLCBcIk5vIGZpbGVzIHVwbG9hZGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgZ2V0SW1hZ2VTcmNEcm9wID0gZnVuY3Rpb24oZGF0YVRyYW5zZmVyKSB7XG4gICAgICAgICAgICB2YXIgdXJsLCBtYXRjaGVkO1xuICAgICAgICAgICAgaWYgKGRhdGFUcmFuc2ZlciAmJiB0eXBlb2YgZGF0YVRyYW5zZmVyLmdldERhdGEgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHVybCA9IGRhdGFUcmFuc2Zlci5nZXREYXRhKFwidGV4dFwiKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB1cmwgPSB1cmwgfHwgZGF0YVRyYW5zZmVyLmdldERhdGEoXCJ0ZXh0L2h0bWxcIik7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBmcC51dGlsLmNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh1cmwgJiYgIWZwLnV0aWwuaXNVcmwodXJsKSkge1xuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gdXJsLm1hdGNoKC88aW1nLio/c3JjPVwiKC4qPylcIi9pKTtcbiAgICAgICAgICAgICAgICAgICAgdXJsID0gbWF0Y2hlZCAmJiBtYXRjaGVkLmxlbmd0aCA+IDEgPyBtYXRjaGVkWzFdIDogbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdXJsO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzU3JjVXBsb2FkKGJsb2IpIHtcbiAgICAgICAgICAgIHZhciBzdWNjZXNzSGFuZGxlckZvck9uZUZpbGUgPSBnZXRTdWNjZXNzSGFuZGxlcigwLCAxKTtcbiAgICAgICAgICAgIHZhciBibG9iVG9DaGVjayA9IGZwLnV0aWwuY2xvbmUoYmxvYik7XG4gICAgICAgICAgICBibG9iVG9DaGVjay5uYW1lID0gYmxvYlRvQ2hlY2suZmlsZW5hbWU7XG4gICAgICAgICAgICBpZiAodmVyaWZ5VXBsb2FkKFsgYmxvYlRvQ2hlY2sgXSkpIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzSGFuZGxlckZvck9uZUZpbGUoYmxvYik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZwLmZpbGVzLnJlbW92ZShibG9iLnVybCwgc3RvcmVfb3B0aW9ucywgZnVuY3Rpb24oKSB7fSwgZnVuY3Rpb24oKSB7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gdXBsb2FkRHJvcHBlZEZpbGVzKGZpbGVzKSB7XG4gICAgICAgICAgICB2YXIgdG90YWwgPSBmaWxlcy5sZW5ndGgsIGk7XG4gICAgICAgICAgICBpZiAodmVyaWZ5VXBsb2FkKGZpbGVzKSkge1xuICAgICAgICAgICAgICAgIG9uU3RhcnQoZmlsZXMpO1xuICAgICAgICAgICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiLCBcImRpc2FibGVkXCIpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBmaWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBmcC5zdG9yZShmaWxlc1tpXSwgc3RvcmVfb3B0aW9ucywgZ2V0U3VjY2Vzc0hhbmRsZXIoaSwgdG90YWwpLCBlcnJvckhhbmRsZXIsIGdldFByb2dyZXNzSGFuZGxlcihpLCB0b3RhbCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiB1cGxvYWRJbWFnZVNyYyhpbWFnZVNyYykge1xuICAgICAgICAgICAgdmFyIHByb2dyZXNzSGFuZGxlckZvck9uZUZpbGUgPSBnZXRQcm9ncmVzc0hhbmRsZXIoMCwgMSk7XG4gICAgICAgICAgICBmcC5zdG9yZVVybChpbWFnZVNyYywgb25TdWNjZXNzU3JjVXBsb2FkLCBlcnJvckhhbmRsZXIsIHByb2dyZXNzSGFuZGxlckZvck9uZUZpbGUpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIGlzRm9sZGVyRHJvcHBlZChldmVudCkge1xuICAgICAgICAgICAgdmFyIGVudHJ5LCBpdGVtcywgaTtcbiAgICAgICAgICAgIGlmIChldmVudC5kYXRhVHJhbnNmZXIuaXRlbXMpIHtcbiAgICAgICAgICAgICAgICBpdGVtcyA9IGV2ZW50LmRhdGFUcmFuc2Zlci5pdGVtcztcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZW50cnkgPSBpdGVtc1tpXSAmJiBpdGVtc1tpXS53ZWJraXRHZXRBc0VudHJ5ID8gaXRlbXNbaV0ud2Via2l0R2V0QXNFbnRyeSgpIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW50cnkgJiYgISFlbnRyeS5pc0RpcmVjdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb25FcnJvcihcIldyb25nVHlwZVwiLCBcIlVwbG9hZGluZyBhIGZvbGRlciBpcyBub3QgYWxsb3dlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBlbmFibGVkOiBjYW5EcmFnRHJvcCxcbiAgICAgICAgbWFrZURyb3BQYW5lOiBtYWtlRHJvcFBhbmVcbiAgICB9O1xufSk7XG5cblwidXNlIHN0cmljdFwiO1xuXG5maWxlcGlja2VyLmV4dGVuZChcInJlc3BvbnNpdmVJbWFnZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZwID0gdGhpcztcbiAgICB2YXIgV0lORE9XX1JFU0laRV9USU1FT1VUID0gMjAwO1xuICAgIHZhciByZWxvYWRXaXRoRGVib3VuY2UgPSBkZWJvdW5jZShmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3RydWN0QWxsKCk7XG4gICAgfSwgV0lORE9XX1JFU0laRV9USU1FT1VUKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBhY3RpdmF0ZTogYWN0aXZhdGUsXG4gICAgICAgIGRlYWN0aXZhdGU6IGRlYWN0aXZhdGUsXG4gICAgICAgIHVwZGF0ZTogdXBkYXRlLFxuICAgICAgICBzZXRSZXNwb25zaXZlT3B0aW9uczogc2V0UmVzcG9uc2l2ZU9wdGlvbnMsXG4gICAgICAgIGdldFJlc3BvbnNpdmVPcHRpb25zOiBnZXRSZXNwb25zaXZlT3B0aW9ucyxcbiAgICAgICAgZ2V0RWxlbWVudERpbXM6IGdldEVsZW1lbnREaW1zLFxuICAgICAgICByZXBsYWNlU3JjOiByZXBsYWNlU3JjLFxuICAgICAgICBnZXRDdXJyZW50UmVzaXplUGFyYW1zOiBnZXRDdXJyZW50UmVzaXplUGFyYW1zLFxuICAgICAgICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdCxcbiAgICAgICAgY29uc3RydWN0UGFyYW1zOiBjb25zdHJ1Y3RQYXJhbXMsXG4gICAgICAgIHNob3VsZENvbnN0cnVjdDogc2hvdWxkQ29uc3RydWN0LFxuICAgICAgICByb3VuZFdpdGhTdGVwOiByb3VuZFdpdGhTdGVwLFxuICAgICAgICBhZGRXaW5kb3dSZXNpemVFdmVudDogYWRkV2luZG93UmVzaXplRXZlbnQsXG4gICAgICAgIHJlbW92ZVdpbmRvd1Jlc2l6ZUV2ZW50OiByZW1vdmVXaW5kb3dSZXNpemVFdmVudFxuICAgIH07XG4gICAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gICAgICAgIGNvbnN0cnVjdEFsbCgpO1xuICAgICAgICBhZGRXaW5kb3dSZXNpemVFdmVudChyZWxvYWRXaXRoRGVib3VuY2UpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkZWFjdGl2YXRlKCkge1xuICAgICAgICByZW1vdmVXaW5kb3dSZXNpemVFdmVudChyZWxvYWRXaXRoRGVib3VuY2UpO1xuICAgIH1cbiAgICBmdW5jdGlvbiB1cGRhdGUoZWxlbWVudCkge1xuICAgICAgICBpZiAoZWxlbWVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoZWxlbWVudC5ub2RlTmFtZSA9PT0gXCJJTUdcIikge1xuICAgICAgICAgICAgICAgIGNvbnN0cnVjdChlbGVtZW50KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJQYXNzZWQgb2JqZWN0IGlzIG5vdCBhbiBpbWFnZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdEFsbCh0cnVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBjb25zdHJ1Y3RBbGwoZm9yY2VDb25zdHJ1Y3QpIHtcbiAgICAgICAgdmFyIHJlc3BvbnNpdmVJbWFnZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiaW1nW2RhdGEtZnAtc3JjXVwiKSwgZWxlbWVudCwgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHJlc3BvbnNpdmVJbWFnZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSByZXNwb25zaXZlSW1hZ2VzW2ldO1xuICAgICAgICAgICAgaWYgKHNob3VsZENvbnN0cnVjdChlbGVtZW50KSB8fCBmb3JjZUNvbnN0cnVjdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0cnVjdChlbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBzaG91bGRDb25zdHJ1Y3QoaW1hZ2UpIHtcbiAgICAgICAgdmFyIGltYWdlU3JjID0gZ2V0U3JjQXR0cihpbWFnZSksIGNoYW5nZU9uUmVzaXplID0gZ2V0RnBPblJlc2l6ZUF0dHIoaW1hZ2UpIHx8IGdldFJlc3BvbnNpdmVPcHRpb25zKCkub25SZXNpemUgfHwgXCJhbGxcIjtcbiAgICAgICAgaWYgKCFpbWFnZVNyYyB8fCBjaGFuZ2VPblJlc2l6ZSA9PT0gXCJhbGxcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoYW5nZU9uUmVzaXplID09PSBcIm5vbmVcIikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzaG91bGRCZUVubGFyZ2VkID0gZ2V0Q3VycmVudFJlc2l6ZVBhcmFtcyhpbWFnZVNyYykud2lkdGggPCBnZXRFbGVtZW50RGltcyhpbWFnZSkud2lkdGg7XG4gICAgICAgIGlmIChzaG91bGRCZUVubGFyZ2VkICYmIGNoYW5nZU9uUmVzaXplID09PSBcInVwXCIgfHwgIXNob3VsZEJlRW5sYXJnZWQgJiYgY2hhbmdlT25SZXNpemUgPT09IFwiZG93blwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldEVsZW1lbnREaW1zKGVsZW0pIHtcbiAgICAgICAgdmFyIGRpbXMgPSB7fTtcbiAgICAgICAgaWYgKGVsZW0ucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZGltcy53aWR0aCA9IGZwLndpbmRvd1V0aWxzLmdldFdpZHRoKCk7XG4gICAgICAgICAgICBkaW1zLmhlaWdodCA9IGZwLndpbmRvd1V0aWxzLmdldFdpZHRoKCk7XG4gICAgICAgICAgICByZXR1cm4gZGltcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbS5hbHQgJiYgIWVsZW0uZnBBbHRDaGVjaykge1xuICAgICAgICAgICAgZWxlbS5wYXJlbnROb2RlLmZwQWx0Q2hlY2sgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIGdldEVsZW1lbnREaW1zKGVsZW0ucGFyZW50Tm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgZGltcy53aWR0aCA9IGVsZW0ub2Zmc2V0V2lkdGg7XG4gICAgICAgIGRpbXMuaGVpZ2h0ID0gZWxlbS5vZmZzZXRIZWlnaHQ7XG4gICAgICAgIGlmICghZGltcy53aWR0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldEVsZW1lbnREaW1zKGVsZW0ucGFyZW50Tm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpbXM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlcGxhY2VTcmMoZWxlbSwgbmV3U3JjKSB7XG4gICAgICAgIHZhciBwcmV2aW91c1NyYyA9IGdldFNyY0F0dHIoZWxlbSkgfHwgZ2V0RnBTcmNBdHRyKGVsZW0pO1xuICAgICAgICBpZiAocHJldmlvdXNTcmMgIT09IG5ld1NyYykge1xuICAgICAgICAgICAgZWxlbS5zcmMgPSBuZXdTcmM7XG4gICAgICAgICAgICBpZiAocHJldmlvdXNTcmMpIHtcbiAgICAgICAgICAgICAgICBlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5zcmMgPSBwcmV2aW91c1NyYztcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5vbmVycm9yID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldEZwT25SZXNpemVBdHRyKGVsZW0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1vbi1yZXNpemVcIik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldEZwUGl4ZWxSb3VuZEF0dHIoZWxlbSkge1xuICAgICAgICByZXR1cm4gZWxlbS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLXBpeGVsLXJvdW5kXCIpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRTcmNBdHRyKGVsZW0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKFwic3JjXCIpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRGcFNyY0F0dHIoZWxlbSkge1xuICAgICAgICByZXR1cm4gZWxlbS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLXNyY1wiKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0RnBLZXlBdHRyKGVsZW0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1hcGlrZXlcIik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldEZwU2lnbmF0dXJlQXR0cihlbGVtKSB7XG4gICAgICAgIHJldHVybiBlbGVtLmdldEF0dHJpYnV0ZShcImRhdGEtZnAtc2lnbmF0dXJlXCIpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRGcFBvbGljeUF0dHIoZWxlbSkge1xuICAgICAgICByZXR1cm4gZWxlbS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLXBvbGljeVwiKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0Q3VycmVudFJlc2l6ZVBhcmFtcyh1cmwpIHtcbiAgICAgICAgcmV0dXJuIGZwLmNvbnZlcnNpb25zVXRpbC5wYXJzZVVybCh1cmwpLm9wdGlvbnNEaWN0LnJlc2l6ZSB8fCB7fTtcbiAgICB9XG4gICAgZnVuY3Rpb24gY29uc3RydWN0KGVsZW0pIHtcbiAgICAgICAgdmFyIHVybCA9IGdldEZwU3JjQXR0cihlbGVtKSB8fCBnZXRTcmNBdHRyKGVsZW0pLCBhcGlrZXkgPSBnZXRGcEtleUF0dHIoZWxlbSkgfHwgZnAuYXBpa2V5LCByZXNwb25zaXZlT3B0aW9ucyA9IGdldFJlc3BvbnNpdmVPcHRpb25zKCk7XG4gICAgICAgIGlmICghZnAuYXBpa2V5KSB7XG4gICAgICAgICAgICBmcC5zZXRLZXkoYXBpa2V5KTtcbiAgICAgICAgICAgIGZwLnV0aWwuY2hlY2tBcGlLZXkoKTtcbiAgICAgICAgfVxuICAgICAgICByZXBsYWNlU3JjKGVsZW0sIGZwLmNvbnZlcnNpb25zVXRpbC5idWlsZFVybCh1cmwsIGNvbnN0cnVjdFBhcmFtcyhlbGVtLCByZXNwb25zaXZlT3B0aW9ucyksIGFwaWtleSkpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjb25zdHJ1Y3RQYXJhbXMoZWxlbSwgcmVzcG9uc2l2ZU9wdGlvbnMpIHtcbiAgICAgICAgcmVzcG9uc2l2ZU9wdGlvbnMgPSByZXNwb25zaXZlT3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdmFyIGRpbXMgPSBnZXRFbGVtZW50RGltcyhlbGVtKSwgcGl4ZWxSb3VuZCA9IGdldEZwUGl4ZWxSb3VuZEF0dHIoZWxlbSkgfHwgcmVzcG9uc2l2ZU9wdGlvbnMucGl4ZWxSb3VuZCB8fCAxMCwgcGFyYW1zID0ge1xuICAgICAgICAgICAgcmVzaXplOiB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IHJvdW5kV2l0aFN0ZXAoZGltcy53aWR0aCwgcGl4ZWxSb3VuZClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgc2lnbmF0dXJlID0gcmVzcG9uc2l2ZU9wdGlvbnMuc2lnbmF0dXJlIHx8IGdldEZwU2lnbmF0dXJlQXR0cihlbGVtKTtcbiAgICAgICAgaWYgKHNpZ25hdHVyZSkge1xuICAgICAgICAgICAgcGFyYW1zLnNlY3VyaXR5ID0ge1xuICAgICAgICAgICAgICAgIHNpZ25hdHVyZTogc2lnbmF0dXJlLFxuICAgICAgICAgICAgICAgIHBvbGljeTogcmVzcG9uc2l2ZU9wdGlvbnMucG9saWN5IHx8IGdldEZwUG9saWN5QXR0cihlbGVtKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0KSB7XG4gICAgICAgIHZhciB0aW1lb3V0O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgICAgIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBhZGRXaW5kb3dSZXNpemVFdmVudChvbldpbmRvd1Jlc2l6ZWQpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBvbldpbmRvd1Jlc2l6ZWQsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgIHdpbmRvdy5hdHRhY2hFdmVudChcIm9ucmVzaXplXCIsIG9uV2luZG93UmVzaXplZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcmVtb3ZlV2luZG93UmVzaXplRXZlbnQob25XaW5kb3dSZXNpemVkKSB7XG4gICAgICAgIGlmICh3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgb25XaW5kb3dSZXNpemVkLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSBpZiAod2luZG93LmRldGFjaEV2ZW50KSB7XG4gICAgICAgICAgICB3aW5kb3cuZGV0YWNoRXZlbnQoXCJvbnJlc2l6ZVwiLCBvbldpbmRvd1Jlc2l6ZWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldFJlc3BvbnNpdmVPcHRpb25zKCkge1xuICAgICAgICByZXR1cm4gZnAucmVzcG9uc2l2ZU9wdGlvbnMgfHwge307XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldFJlc3BvbnNpdmVPcHRpb25zKG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IGZwLkZpbGVwaWNrZXJFeGNlcHRpb24oXCJSZXNwb25zaXZlIG9wdGlvbnMgbXVzdCBiZSBhbiBvYmplY3QuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGZwLnJlc3BvbnNpdmVPcHRpb25zID0gb3B0aW9ucztcbiAgICB9XG4gICAgZnVuY3Rpb24gcm91bmRXaXRoU3RlcCh2YWx1ZSwgcm91bmQpIHtcbiAgICAgICAgdmFyIHBpeGVsUm91bmRpbmcgPSByb3VuZCA9PT0gMCA/IDEgOiByb3VuZDtcbiAgICAgICAgcmV0dXJuIE1hdGguY2VpbCh2YWx1ZSAvIHBpeGVsUm91bmRpbmcpICogcGl4ZWxSb3VuZGluZztcbiAgICB9XG59KTtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZpbGVwaWNrZXIuZXh0ZW5kKFwid2lkZ2V0c1wiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnAgPSB0aGlzO1xuICAgIHZhciBzZXRBdHRySWZFeGlzdHMgPSBmdW5jdGlvbihrZXksIG9wdGlvbnMsIGF0dHJuYW1lLCBkb20pIHtcbiAgICAgICAgdmFyIHZhbCA9IGRvbS5nZXRBdHRyaWJ1dGUoYXR0cm5hbWUpO1xuICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICBvcHRpb25zW2tleV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBmaXJlT25DaGFuZ2VFdmVudCA9IGZ1bmN0aW9uKGlucHV0LCBmcGZpbGVzKSB7XG4gICAgICAgIHZhciBlO1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpIHtcbiAgICAgICAgICAgIGUgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkV2ZW50XCIpO1xuICAgICAgICAgICAgZS5pbml0RXZlbnQoXCJjaGFuZ2VcIiwgdHJ1ZSwgZmFsc2UpO1xuICAgICAgICAgICAgZS5mcGZpbGUgPSBmcGZpbGVzID8gZnBmaWxlc1swXSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGUuZnBmaWxlcyA9IGZwZmlsZXM7XG4gICAgICAgICAgICBpbnB1dC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KSB7XG4gICAgICAgICAgICBlID0gZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3QoXCJFdmVudFwiKTtcbiAgICAgICAgICAgIGUuZXZlbnRQaGFzZSA9IDI7XG4gICAgICAgICAgICBlLmN1cnJlbnRUYXJnZXQgPSBlLnNyY0VsZW1lbnQgPSBlLnRhcmdldCA9IGlucHV0O1xuICAgICAgICAgICAgZS5mcGZpbGUgPSBmcGZpbGVzID8gZnBmaWxlc1swXSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGUuZnBmaWxlcyA9IGZwZmlsZXM7XG4gICAgICAgICAgICBpbnB1dC5maXJlRXZlbnQoXCJvbmNoYW5nZVwiLCBlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5vbmNoYW5nZSkge1xuICAgICAgICAgICAgaW5wdXQub25jaGFuZ2UoZnBmaWxlcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBzcGxpdElmRXhpc3QgPSBmdW5jdGlvbihrZXksIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnNba2V5XSkge1xuICAgICAgICAgICAgb3B0aW9uc1trZXldID0gb3B0aW9uc1trZXldLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIHNldEF0dHJJZkV4aXN0c0FycmF5ID0gZnVuY3Rpb24oZnBvcHRpb25zLCBkb21FbGVtZW50LCBvcHRpb25zT2JqKSB7XG4gICAgICAgIGZvciAodmFyIG9wdGlvbiBpbiBvcHRpb25zT2JqKSB7XG4gICAgICAgICAgICBzZXRBdHRySWZFeGlzdHMob3B0aW9uc09ialtvcHRpb25dLCBmcG9wdGlvbnMsIG9wdGlvbiwgZG9tRWxlbWVudCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3RPcHRpb25zID0gZnVuY3Rpb24oZG9tRWxlbWVudCwgbW9kZSkge1xuICAgICAgICBtb2RlID0gbW9kZSB8fCBcInBpY2tcIjtcbiAgICAgICAgdmFyIGZwb3B0aW9ucyA9IHt9LCBnZW5lcmFsT3B0aW9uc01hcCA9IHtcbiAgICAgICAgICAgIFwiZGF0YS1mcC1jb250YWluZXJcIjogXCJjb250YWluZXJcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1taW1ldHlwZVwiOiBcIm1pbWV0eXBlXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtZXh0ZW5zaW9uXCI6IFwiZXh0ZW5zaW9uXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtb3BlblRvXCI6IFwib3BlblRvXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtZGVidWdcIjogXCJkZWJ1Z1wiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLXNpZ25hdHVyZVwiOiBcInNpZ25hdHVyZVwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLXBvbGljeVwiOiBcInBvbGljeVwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWxhbmd1YWdlXCI6IFwibGFuZ3VhZ2VcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1iYWNrZ3JvdW5kLXVwbG9hZFwiOiBcImJhY2tncm91bmRVcGxvYWRcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1oaWRlXCI6IFwiaGlkZVwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWN1c3RvbS1jc3NcIjogXCJjdXN0b21Dc3NcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1jcm9wLWZvcmNlXCI6IFwiY3JvcEZvcmNlXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtY3JvcC1yYXRpb1wiOiBcImNyb3BSYXRpb1wiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWNyb3AtZGltXCI6IFwiY3JvcERpbVwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWNyb3AtbWF4XCI6IFwiY3JvcE1heFwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWNyb3AtbWluXCI6IFwiY3JvcE1pblwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLXNob3ctY2xvc2VcIjogXCJzaG93Q2xvc2VcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1jb252ZXJzaW9uc1wiOiBcImNvbnZlcnNpb25zXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtY3VzdG9tLXRleHRcIjogXCJjdXN0b21UZXh0XCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtY3VzdG9tLXNvdXJjZS1jb250YWluZXJcIjogXCJjdXN0b21Tb3VyY2VDb250YWluZXJcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1jdXN0b20tc291cmNlLXBhdGhcIjogXCJjdXN0b21Tb3VyY2VQYXRoXCJcbiAgICAgICAgfSwgcGlja09ubHlPcHRpb25zTWFwID0ge1xuICAgICAgICAgICAgXCJkYXRhLWZwLW1pbWV0eXBlc1wiOiBcIm1pbWV0eXBlc1wiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWV4dGVuc2lvbnNcIjogXCJleHRlbnNpb25zXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtbWF4U2l6ZVwiOiBcIm1heFNpemVcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1tYXhGaWxlc1wiOiBcIm1heEZpbGVzXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtc3RvcmUtbG9jYXRpb25cIjogXCJzdG9yZUxvY2F0aW9uXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtc3RvcmUtcGF0aFwiOiBcInN0b3JlUGF0aFwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLXN0b3JlLWNvbnRhaW5lclwiOiBcInN0b3JlQ29udGFpbmVyXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtc3RvcmUtcmVnaW9uXCI6IFwic3RvcmVSZWdpb25cIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1zdG9yZS1hY2Nlc3NcIjogXCJzdG9yZUFjY2Vzc1wiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWltYWdlLXF1YWxpdHlcIjogXCJpbWFnZVF1YWxpdHlcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1pbWFnZS1kaW1cIjogXCJpbWFnZURpbVwiLFxuICAgICAgICAgICAgXCJkYXRhLWZwLWltYWdlLW1heFwiOiBcImltYWdlTWF4XCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtaW1hZ2UtbWluXCI6IFwiaW1hZ2VNaW5cIlxuICAgICAgICB9LCB3ZWJjYW1PcHRpb25zTWFwID0ge1xuICAgICAgICAgICAgXCJkYXRhLWZwLXZpZGVvLXJlY29yZGluZy1yZXNvbHV0aW9uXCI6IFwidmlkZW9SZXNcIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC13ZWJjYW0tZGltXCI6IFwid2ViY2FtRGltXCIsXG4gICAgICAgICAgICBcImRhdGEtZnAtdmlkZW8tbGVuZ3RoXCI6IFwidmlkZW9MZW5cIixcbiAgICAgICAgICAgIFwiZGF0YS1mcC1hdWRpby1sZW5ndGhcIjogXCJhdWRpb0xlblwiXG4gICAgICAgIH07XG4gICAgICAgIHNldEF0dHJJZkV4aXN0c0FycmF5KGZwb3B0aW9ucywgZG9tRWxlbWVudCwgZ2VuZXJhbE9wdGlvbnNNYXApO1xuICAgICAgICBpZiAobW9kZSA9PT0gXCJleHBvcnRcIikge1xuICAgICAgICAgICAgc2V0QXR0cklmRXhpc3RzKFwic3VnZ2VzdGVkRmlsZW5hbWVcIiwgZnBvcHRpb25zLCBcImRhdGEtZnAtc3VnZ2VzdGVkRmlsZW5hbWVcIiwgZG9tRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gXCJwaWNrXCIpIHtcbiAgICAgICAgICAgIHNldEF0dHJJZkV4aXN0c0FycmF5KGZwb3B0aW9ucywgZG9tRWxlbWVudCwgcGlja09ubHlPcHRpb25zTWFwKTtcbiAgICAgICAgICAgIGZwb3B0aW9ucy53ZWJjYW0gPSB7fTtcbiAgICAgICAgICAgIHNldEF0dHJJZkV4aXN0c0FycmF5KGZwb3B0aW9ucy53ZWJjYW0sIGRvbUVsZW1lbnQsIHdlYmNhbU9wdGlvbnNNYXApO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzZXJ2aWNlcyA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1zZXJ2aWNlc1wiKTtcbiAgICAgICAgaWYgKHNlcnZpY2VzKSB7XG4gICAgICAgICAgICBzZXJ2aWNlcyA9IHNlcnZpY2VzLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgc2VydmljZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlc1tqXSA9IGZwLnNlcnZpY2VzW3NlcnZpY2VzW2pdLnJlcGxhY2UoXCIgXCIsIFwiXCIpXSB8fCBzZXJ2aWNlc1tqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZwb3B0aW9ucy5zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzZXJ2aWNlID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLXNlcnZpY2VcIik7XG4gICAgICAgIGlmIChzZXJ2aWNlKSB7XG4gICAgICAgICAgICBmcG9wdGlvbnMuc2VydmljZSA9IGZwLnNlcnZpY2VzW3NlcnZpY2UucmVwbGFjZShcIiBcIiwgXCJcIildIHx8IHNlcnZpY2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFycmF5VG9TcGxpdCA9IFsgXCJleHRlbnNpb25zXCIsIFwibWltZXR5cGVzXCIsIFwiaW1hZ2VEaW1cIiwgXCJpbWFnZU1pblwiLCBcImltYWdlTWF4XCIsIFwiY3JvcERpbVwiLCBcImNyb3BNYXhcIiwgXCJjcm9wTWluXCIsIFwid2ViY2FtRGltXCIsIFwiY29udmVyc2lvbnNcIiBdO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXJyYXlUb1NwbGl0KSB7XG4gICAgICAgICAgICBzcGxpdElmRXhpc3QoYXJyYXlUb1NwbGl0W2tleV0sIGZwb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFwaWtleSA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1hcGlrZXlcIik7XG4gICAgICAgIGlmIChhcGlrZXkpIHtcbiAgICAgICAgICAgIGZwLnNldEtleShhcGlrZXkpO1xuICAgICAgICB9XG4gICAgICAgIGZwb3B0aW9ucy5mb2xkZXJzID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLWZvbGRlcnNcIikgPT09IFwidHJ1ZVwiO1xuICAgICAgICByZXR1cm4gZnBvcHRpb25zO1xuICAgIH07XG4gICAgdmFyIGlzTXVsdGlwbGUgPSBmdW5jdGlvbihkb21FbGVtZW50KSB7XG4gICAgICAgIHJldHVybiBkb21FbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtZnAtbXVsdGlwbGVcIikgPT09IFwidHJ1ZVwiO1xuICAgIH07XG4gICAgdmFyIGNvbnN0cnVjdFBpY2tXaWRnZXQgPSBmdW5jdGlvbihkb21FbGVtZW50KSB7XG4gICAgICAgIHZhciB3aWRnZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xuICAgICAgICB3aWRnZXQuc2V0QXR0cmlidXRlKFwidHlwZVwiLCBcImJ1dHRvblwiKTtcbiAgICAgICAgd2lkZ2V0LmlubmVySFRNTCA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1idXR0b24tdGV4dFwiKSB8fCBcIlBpY2sgRmlsZVwiO1xuICAgICAgICB3aWRnZXQuY2xhc3NOYW1lID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLWJ1dHRvbi1jbGFzc1wiKSB8fCBkb21FbGVtZW50LmNsYXNzTmFtZSB8fCBcImZwX19idG5cIjtcbiAgICAgICAgZG9tRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIHZhciBmcG9wdGlvbnMgPSBjb25zdHJ1Y3RPcHRpb25zKGRvbUVsZW1lbnQpO1xuICAgICAgICBpZiAoaXNNdWx0aXBsZShkb21FbGVtZW50KSkge1xuICAgICAgICAgICAgd2lkZ2V0Lm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB3aWRnZXQuYmx1cigpO1xuICAgICAgICAgICAgICAgIGZwLnBpY2tNdWx0aXBsZShmcG9wdGlvbnMsIGZ1bmN0aW9uKGZwZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVybHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBmcGZpbGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmxzLnB1c2goZnBmaWxlc1tqXS51cmwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRvbUVsZW1lbnQudmFsdWUgPSB1cmxzLmpvaW4oKTtcbiAgICAgICAgICAgICAgICAgICAgZmlyZU9uQ2hhbmdlRXZlbnQoZG9tRWxlbWVudCwgZnBmaWxlcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdpZGdldC5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgd2lkZ2V0LmJsdXIoKTtcbiAgICAgICAgICAgICAgICBmcC5waWNrKGZwb3B0aW9ucywgZnVuY3Rpb24oZnBmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbUVsZW1lbnQudmFsdWUgPSBmcGZpbGUudXJsO1xuICAgICAgICAgICAgICAgICAgICBmaXJlT25DaGFuZ2VFdmVudChkb21FbGVtZW50LCBbIGZwZmlsZSBdKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGRvbUVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUod2lkZ2V0LCBkb21FbGVtZW50Lm5leHRTaWJsaW5nKTtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3RDb252ZXJ0V2lkZ2V0ID0gZnVuY3Rpb24oZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgdXJsID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLXVybFwiKTtcbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciB3aWRnZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xuICAgICAgICB3aWRnZXQuc2V0QXR0cmlidXRlKFwidHlwZVwiLCBcImJ1dHRvblwiKTtcbiAgICAgICAgd2lkZ2V0LmlubmVySFRNTCA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC1idXR0b24tdGV4dFwiKSB8fCBcIkNvbnZlcnQgRmlsZVwiO1xuICAgICAgICB3aWRnZXQuY2xhc3NOYW1lID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLWJ1dHRvbi1jbGFzc1wiKSB8fCBkb21FbGVtZW50LmNsYXNzTmFtZSB8fCBcImZwX19idG5cIjtcbiAgICAgICAgZG9tRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIHZhciBmcG9wdGlvbnMgPSBjb25zdHJ1Y3RPcHRpb25zKGRvbUVsZW1lbnQsIFwiY29udmVydFwiKTtcbiAgICAgICAgd2lkZ2V0Lm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpZGdldC5ibHVyKCk7XG4gICAgICAgICAgICBmcC5wcm9jZXNzSW1hZ2UodXJsLCBmcG9wdGlvbnMsIGZ1bmN0aW9uKGZwZmlsZSkge1xuICAgICAgICAgICAgICAgIGRvbUVsZW1lbnQudmFsdWUgPSBmcGZpbGUudXJsO1xuICAgICAgICAgICAgICAgIGZpcmVPbkNoYW5nZUV2ZW50KGRvbUVsZW1lbnQsIFsgZnBmaWxlIF0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG4gICAgICAgIGRvbUVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUod2lkZ2V0LCBkb21FbGVtZW50Lm5leHRTaWJsaW5nKTtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3REcmFnV2lkZ2V0ID0gZnVuY3Rpb24oZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgcGFuZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHBhbmUuY2xhc3NOYW1lID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLWNsYXNzXCIpIHx8IGRvbUVsZW1lbnQuY2xhc3NOYW1lO1xuICAgICAgICBwYW5lLnN0eWxlLnBhZGRpbmcgPSBcIjFweFwiO1xuICAgICAgICBkb21FbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgZG9tRWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShwYW5lLCBkb21FbGVtZW50Lm5leHRTaWJsaW5nKTtcbiAgICAgICAgdmFyIHBpY2tCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xuICAgICAgICBwaWNrQnV0dG9uLnNldEF0dHJpYnV0ZShcInR5cGVcIiwgXCJidXR0b25cIik7XG4gICAgICAgIHBpY2tCdXR0b24uaW5uZXJIVE1MID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLWJ1dHRvbi10ZXh0XCIpIHx8IFwiUGljayBGaWxlXCI7XG4gICAgICAgIHBpY2tCdXR0b24uY2xhc3NOYW1lID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLWJ1dHRvbi1jbGFzc1wiKSB8fCBcImZwX19idG5cIjtcbiAgICAgICAgcGFuZS5hcHBlbmRDaGlsZChwaWNrQnV0dG9uKTtcbiAgICAgICAgdmFyIGRyYWdQYW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgc2V0dXBEcmFnQ29udGFpbmVyKGRyYWdQYW5lKTtcbiAgICAgICAgZHJhZ1BhbmUuaW5uZXJIVE1MID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLWRyYWctdGV4dFwiKSB8fCBcIk9yIGRyb3AgZmlsZXMgaGVyZVwiO1xuICAgICAgICBkcmFnUGFuZS5jbGFzc05hbWUgPSBkb21FbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtZnAtZHJhZy1jbGFzc1wiKSB8fCBcIlwiO1xuICAgICAgICBwYW5lLmFwcGVuZENoaWxkKGRyYWdQYW5lKTtcbiAgICAgICAgdmFyIGZwb3B0aW9ucyA9IGNvbnN0cnVjdE9wdGlvbnMoZG9tRWxlbWVudCksIG11bHRpcGxlID0gaXNNdWx0aXBsZShkb21FbGVtZW50KTtcbiAgICAgICAgaWYgKGZwLmRyYWdkcm9wLmVuYWJsZWQoKSkge1xuICAgICAgICAgICAgc2V0dXBEcm9wUGFuZShkcmFnUGFuZSwgbXVsdGlwbGUsIGZwb3B0aW9ucywgZG9tRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkcmFnUGFuZS5pbm5lckhUTUwgPSBcIiZuYnNwO1wiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgZHJhZ1BhbmUub25jbGljayA9IHBpY2tCdXR0b24ub25jbGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHBpY2tCdXR0b24uYmx1cigpO1xuICAgICAgICAgICAgICAgIGZwLnBpY2tNdWx0aXBsZShmcG9wdGlvbnMsIGZ1bmN0aW9uKGZwZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVybHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGVuYW1lcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGZwZmlsZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybHMucHVzaChmcGZpbGVzW2pdLnVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZXMucHVzaChmcGZpbGVzW2pdLmZpbGVuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkb21FbGVtZW50LnZhbHVlID0gdXJscy5qb2luKCk7XG4gICAgICAgICAgICAgICAgICAgIG9uRmlsZXNVcGxvYWRlZChkb21FbGVtZW50LCBkcmFnUGFuZSwgZmlsZW5hbWVzLmpvaW4oXCIsIFwiKSk7XG4gICAgICAgICAgICAgICAgICAgIGZpcmVPbkNoYW5nZUV2ZW50KGRvbUVsZW1lbnQsIGZwZmlsZXMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkcmFnUGFuZS5vbmNsaWNrID0gcGlja0J1dHRvbi5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcGlja0J1dHRvbi5ibHVyKCk7XG4gICAgICAgICAgICAgICAgZnAucGljayhmcG9wdGlvbnMsIGZ1bmN0aW9uKGZwZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBkb21FbGVtZW50LnZhbHVlID0gZnBmaWxlLnVybDtcbiAgICAgICAgICAgICAgICAgICAgb25GaWxlc1VwbG9hZGVkKGRvbUVsZW1lbnQsIGRyYWdQYW5lLCBmcGZpbGUuZmlsZW5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBmaXJlT25DaGFuZ2VFdmVudChkb21FbGVtZW50LCBbIGZwZmlsZSBdKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgb25GaWxlc1VwbG9hZGVkID0gZnVuY3Rpb24oaW5wdXQsIG9kcmFnLCB0ZXh0KSB7XG4gICAgICAgIG9kcmFnLmlubmVySFRNTCA9IHRleHQ7XG4gICAgICAgIG9kcmFnLnN0eWxlLnBhZGRpbmcgPSBcIjJweCA0cHhcIjtcbiAgICAgICAgb2RyYWcuc3R5bGUuY3Vyc29yID0gXCJkZWZhdWx0XCI7XG4gICAgICAgIG9kcmFnLnN0eWxlLndpZHRoID0gXCJcIjtcbiAgICAgICAgdmFyIGNhbmNlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICBjYW5jZWwuaW5uZXJIVE1MID0gXCJYXCI7XG4gICAgICAgIGNhbmNlbC5zdHlsZS5ib3JkZXJSYWRpdXMgPSBcIjhweFwiO1xuICAgICAgICBjYW5jZWwuc3R5bGUuZm9udFNpemUgPSBcIjE0cHhcIjtcbiAgICAgICAgY2FuY2VsLnN0eWxlLmNzc0Zsb2F0ID0gXCJyaWdodFwiO1xuICAgICAgICBjYW5jZWwuc3R5bGUucGFkZGluZyA9IFwiMCAzcHhcIjtcbiAgICAgICAgY2FuY2VsLnN0eWxlLmNvbG9yID0gXCIjNjAwXCI7XG4gICAgICAgIGNhbmNlbC5zdHlsZS5jdXJzb3IgPSBcInBvaW50ZXJcIjtcbiAgICAgICAgdmFyIGNsaWNrRm4gPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpZiAoIWUpIHtcbiAgICAgICAgICAgICAgICBlID0gd2luZG93LmV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldHVwRHJhZ0NvbnRhaW5lcihvZHJhZyk7XG4gICAgICAgICAgICBpZiAoIWZwLmRyYWdkcm9wLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBvZHJhZy5pbm5lckhUTUwgPSBcIiZuYnNwO1wiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvZHJhZy5pbm5lckhUTUwgPSBpbnB1dC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLWRyYWctdGV4dFwiKSB8fCBcIk9yIGRyb3AgZmlsZXMgaGVyZVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5wdXQudmFsdWUgPSBcIlwiO1xuICAgICAgICAgICAgZmlyZU9uQ2hhbmdlRXZlbnQoaW5wdXQpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoY2FuY2VsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIGNhbmNlbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY2xpY2tGbiwgZmFsc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKGNhbmNlbC5hdHRhY2hFdmVudCkge1xuICAgICAgICAgICAgY2FuY2VsLmF0dGFjaEV2ZW50KFwib25jbGlja1wiLCBjbGlja0ZuKTtcbiAgICAgICAgfVxuICAgICAgICBvZHJhZy5hcHBlbmRDaGlsZChjYW5jZWwpO1xuICAgIH07XG4gICAgdmFyIHNldHVwRHJhZ0NvbnRhaW5lciA9IGZ1bmN0aW9uKGRyYWdQYW5lKSB7XG4gICAgICAgIGRyYWdQYW5lLnN0eWxlLmJvcmRlciA9IFwiMXB4IGRhc2hlZCAjQUFBXCI7XG4gICAgICAgIGRyYWdQYW5lLnN0eWxlLmRpc3BsYXkgPSBcImlubGluZS1ibG9ja1wiO1xuICAgICAgICBkcmFnUGFuZS5zdHlsZS5tYXJnaW4gPSBcIjAgMCAwIDRweFwiO1xuICAgICAgICBkcmFnUGFuZS5zdHlsZS5ib3JkZXJSYWRpdXMgPSBcIjNweFwiO1xuICAgICAgICBkcmFnUGFuZS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNGM0YzRjNcIjtcbiAgICAgICAgZHJhZ1BhbmUuc3R5bGUuY29sb3IgPSBcIiMzMzNcIjtcbiAgICAgICAgZHJhZ1BhbmUuc3R5bGUuZm9udFNpemUgPSBcIjE0cHhcIjtcbiAgICAgICAgZHJhZ1BhbmUuc3R5bGUubGluZUhlaWdodCA9IFwiMjJweFwiO1xuICAgICAgICBkcmFnUGFuZS5zdHlsZS5wYWRkaW5nID0gXCIycHggNHB4XCI7XG4gICAgICAgIGRyYWdQYW5lLnN0eWxlLnZlcnRpY2FsQWxpZ24gPSBcIm1pZGRsZVwiO1xuICAgICAgICBkcmFnUGFuZS5zdHlsZS5jdXJzb3IgPSBcInBvaW50ZXJcIjtcbiAgICAgICAgZHJhZ1BhbmUuc3R5bGUub3ZlcmZsb3cgPSBcImhpZGRlblwiO1xuICAgIH07XG4gICAgdmFyIHNldHVwRHJvcFBhbmUgPSBmdW5jdGlvbihvZHJhZywgbXVsdGlwbGUsIGZwb3B0aW9ucywgaW5wdXQpIHtcbiAgICAgICAgdmFyIHRleHQgPSBvZHJhZy5pbm5lckhUTUw7XG4gICAgICAgIHZhciBwYmFyO1xuICAgICAgICBmcC5kcmFnZHJvcC5tYWtlRHJvcFBhbmUob2RyYWcsIHtcbiAgICAgICAgICAgIG11bHRpcGxlOiBtdWx0aXBsZSxcbiAgICAgICAgICAgIG1heFNpemU6IGZwb3B0aW9ucy5tYXhTaXplLFxuICAgICAgICAgICAgbWltZXR5cGVzOiBmcG9wdGlvbnMubWltZXR5cGVzLFxuICAgICAgICAgICAgbWltZXR5cGU6IGZwb3B0aW9ucy5taW1ldHlwZSxcbiAgICAgICAgICAgIGV4dGVuc2lvbnM6IGZwb3B0aW9ucy5leHRlbnNpb25zLFxuICAgICAgICAgICAgZXh0ZW5zaW9uOiBmcG9wdGlvbnMuZXh0ZW5zaW9uLFxuICAgICAgICAgICAgbG9jYXRpb246IGZwb3B0aW9ucy5zdG9yZUxvY2F0aW9uLFxuICAgICAgICAgICAgcGF0aDogZnBvcHRpb25zLnN0b3JlUGF0aCxcbiAgICAgICAgICAgIGNvbnRhaW5lcjogZnBvcHRpb25zLnN0b3JlQ29udGFpbmVyLFxuICAgICAgICAgICAgcmVnaW9uOiBmcG9wdGlvbnMuc3RvcmVSZWdpb24sXG4gICAgICAgICAgICBhY2Nlc3M6IGZwb3B0aW9ucy5zdG9yZUFjY2VzcyxcbiAgICAgICAgICAgIHBvbGljeTogZnBvcHRpb25zLnBvbGljeSxcbiAgICAgICAgICAgIHNpZ25hdHVyZTogZnBvcHRpb25zLnNpZ25hdHVyZSxcbiAgICAgICAgICAgIGRyYWdFbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgb2RyYWcuaW5uZXJIVE1MID0gXCJEcm9wIHRvIHVwbG9hZFwiO1xuICAgICAgICAgICAgICAgIG9kcmFnLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiI0UwRTBFMFwiO1xuICAgICAgICAgICAgICAgIG9kcmFnLnN0eWxlLmJvcmRlciA9IFwiMXB4IHNvbGlkICMwMDBcIjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnTGVhdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIG9kcmFnLmlubmVySFRNTCA9IHRleHQ7XG4gICAgICAgICAgICAgICAgb2RyYWcuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCIjRjNGM0YzXCI7XG4gICAgICAgICAgICAgICAgb2RyYWcuc3R5bGUuYm9yZGVyID0gXCIxcHggZGFzaGVkICNBQUFcIjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiBmdW5jdGlvbih0eXBlLCBtc2cpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gXCJUb29NYW55RmlsZXNcIikge1xuICAgICAgICAgICAgICAgICAgICBvZHJhZy5pbm5lckhUTUwgPSBtc2c7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBcIldyb25nVHlwZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9kcmFnLmlubmVySFRNTCA9IG1zZztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwiTm9GaWxlc0ZvdW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb2RyYWcuaW5uZXJIVE1MID0gbXNnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJVcGxvYWRFcnJvclwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9kcmFnLmlubmVySFRNTCA9IFwiT29wcyEgSGFkIHRyb3VibGUgdXBsb2FkaW5nLlwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblN0YXJ0OiBmdW5jdGlvbihmaWxlcykge1xuICAgICAgICAgICAgICAgIHBiYXIgPSBzZXR1cFByb2dyZXNzKG9kcmFnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblByb2dyZXNzOiBmdW5jdGlvbihwZXJjZW50YWdlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBiYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcGJhci5zdHlsZS53aWR0aCA9IHBlcmNlbnRhZ2UgKyBcIiVcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzOiBmdW5jdGlvbihmcGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHMgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgZmlsZW5hbWVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmcGZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHMucHVzaChmcGZpbGVzW2ldLnVybCk7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVuYW1lcy5wdXNoKGZwZmlsZXNbaV0uZmlsZW5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbnB1dC52YWx1ZSA9IHZhbHMuam9pbigpO1xuICAgICAgICAgICAgICAgIG9uRmlsZXNVcGxvYWRlZChpbnB1dCwgb2RyYWcsIGZpbGVuYW1lcy5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgICAgIGZpcmVPbkNoYW5nZUV2ZW50KGlucHV0LCBmcGZpbGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICB2YXIgc2V0dXBQcm9ncmVzcyA9IGZ1bmN0aW9uKG9kcmFnKSB7XG4gICAgICAgIHZhciBwYmFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IG9kcmFnLm9mZnNldEhlaWdodCAtIDI7XG4gICAgICAgIHBiYXIuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICBwYmFyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiIzBFOTBEMlwiO1xuICAgICAgICBwYmFyLnN0eWxlLndpZHRoID0gXCIyJVwiO1xuICAgICAgICBwYmFyLnN0eWxlLmJvcmRlclJhZGl1cyA9IFwiM3B4XCI7XG4gICAgICAgIG9kcmFnLnN0eWxlLndpZHRoID0gb2RyYWcub2Zmc2V0V2lkdGggKyBcInB4XCI7XG4gICAgICAgIG9kcmFnLnN0eWxlLnBhZGRpbmcgPSBcIjBcIjtcbiAgICAgICAgb2RyYWcuc3R5bGUuYm9yZGVyID0gXCIxcHggc29saWQgI0FBQVwiO1xuICAgICAgICBvZHJhZy5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNGM0YzRjNcIjtcbiAgICAgICAgb2RyYWcuc3R5bGUuYm94U2hhZG93ID0gXCJpbnNldCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjEpXCI7XG4gICAgICAgIG9kcmFnLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgIG9kcmFnLmFwcGVuZENoaWxkKHBiYXIpO1xuICAgICAgICByZXR1cm4gcGJhcjtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3RFeHBvcnRXaWRnZXQgPSBmdW5jdGlvbihkb21FbGVtZW50KSB7XG4gICAgICAgIGRvbUVsZW1lbnQub25jbGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHVybCA9IGRvbUVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1mcC11cmxcIik7XG4gICAgICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZwb3B0aW9ucyA9IGNvbnN0cnVjdE9wdGlvbnMoZG9tRWxlbWVudCwgXCJleHBvcnRcIik7XG4gICAgICAgICAgICBmcC5leHBvcnRGaWxlKHVybCwgZnBvcHRpb25zKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBidWlsZFdpZGdldHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwpIHtcbiAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgdmFyIHBpY2tfYmFzZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJmaWxlcGlja2VyXCJdJyk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGlja19iYXNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3RydWN0UGlja1dpZGdldChwaWNrX2Jhc2VbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGRyYWdfd2lkZ2V0cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJmaWxlcGlja2VyLWRyYWdkcm9wXCJdJyk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZHJhZ193aWRnZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3RydWN0RHJhZ1dpZGdldChkcmFnX3dpZGdldHNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNvbnZlcnRfd2lkZ2V0cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJmaWxlcGlja2VyLWNvbnZlcnRcIl0nKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb252ZXJ0X3dpZGdldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdHJ1Y3RDb252ZXJ0V2lkZ2V0KGNvbnZlcnRfd2lkZ2V0c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZXhwb3J0X2Jhc2UgPSBbXTtcbiAgICAgICAgICAgIHZhciB0bXAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiYnV0dG9uW2RhdGEtZnAtdXJsXVwiKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB0bXAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBleHBvcnRfYmFzZS5wdXNoKHRtcFtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0bXAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiYVtkYXRhLWZwLXVybF1cIik7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdG1wLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZXhwb3J0X2Jhc2UucHVzaCh0bXBbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG1wID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbdHlwZT1cImJ1dHRvblwiXVtkYXRhLWZwLXVybF0nKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB0bXAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBleHBvcnRfYmFzZS5wdXNoKHRtcFtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZXhwb3J0X2Jhc2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdHJ1Y3RFeHBvcnRXaWRnZXQoZXhwb3J0X2Jhc2VbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHByZXZpZXdzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW3R5cGU9XCJmaWxlcGlja2VyLXByZXZpZXdcIl1bZGF0YS1mcC11cmxdJyk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcHJldmlld3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdHJ1Y3RQcmV2aWV3KHByZXZpZXdzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFwcGVuZFN0eWxlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3RXaWRnZXQgPSBmdW5jdGlvbihiYXNlKSB7XG4gICAgICAgIGlmIChiYXNlLmpxdWVyeSkge1xuICAgICAgICAgICAgYmFzZSA9IGJhc2VbMF07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJhc2VfdHlwZSA9IGJhc2UuZ2V0QXR0cmlidXRlKFwidHlwZVwiKTtcbiAgICAgICAgaWYgKGJhc2VfdHlwZSA9PT0gXCJmaWxlcGlja2VyXCIpIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdFBpY2tXaWRnZXQoYmFzZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoYmFzZV90eXBlID09PSBcImZpbGVwaWNrZXItZHJhZ2Ryb3BcIikge1xuICAgICAgICAgICAgY29uc3RydWN0RHJhZ1dpZGdldChiYXNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChiYXNlX3R5cGUgPT09IFwiZmlsZXBpY2tlci1wcmV2aWV3XCIpIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdFByZXZpZXcoYmFzZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoYmFzZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLXNyY1wiKSkge1xuICAgICAgICAgICAgZnAucmVzcG9uc2l2ZUltYWdlcy5jb25zdHJ1Y3QoYmFzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RFeHBvcnRXaWRnZXQoYmFzZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3RQcmV2aWV3ID0gZnVuY3Rpb24oZG9tRWxlbWVudCkge1xuICAgICAgICB2YXIgdXJsID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLXVybFwiKSwgY3NzID0gZG9tRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZwLWN1c3RvbS1jc3NcIik7XG4gICAgICAgIHZhciB1cmwgPSBmcC51dGlsLmdldEZQVXJsKHVybCk7XG4gICAgICAgIGlmICghdXJsIHx8ICFmcC51dGlsLmlzRlBVcmwodXJsKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmwgPSB1cmwucmVwbGFjZShcImFwaS9maWxlL1wiLCBcImFwaS9wcmV2aWV3L1wiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgICAgICAgaWYgKGNzcykge1xuICAgICAgICAgICAgdXJsID0gZnAudXRpbC5hcHBlbmRRdWVyeVRvVXJsKHVybCwgXCJjc3NcIiwgY3NzKTtcbiAgICAgICAgfVxuICAgICAgICBpZnJhbWUuc3JjID0gdXJsO1xuICAgICAgICBpZnJhbWUud2lkdGggPSBcIjEwMCVcIjtcbiAgICAgICAgaWZyYW1lLmhlaWdodCA9IFwiMTAwJVwiO1xuICAgICAgICBkb21FbGVtZW50LmFwcGVuZENoaWxkKGlmcmFtZSk7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBhcHBlbmRTdHlsZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhciBjc3MgPSAnLmZwX19idG57LXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7LW1vei1ib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym94LXNpemluZzpib3JkZXItYm94O2Rpc3BsYXk6aW5saW5lLWJsb2NrO2hlaWdodDozNHB4O3BhZGRpbmc6NHB4IDMwcHggNXB4IDQwcHg7cG9zaXRpb246cmVsYXRpdmU7bWFyZ2luLWJvdHRvbTowO3ZlcnRpY2FsLWFsaWduOm1pZGRsZTstbXMtdG91Y2gtYWN0aW9uOm1hbmlwdWxhdGlvbjt0b3VjaC1hY3Rpb246bWFuaXB1bGF0aW9uO2N1cnNvcjpwb2ludGVyOy13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTstbW96LXVzZXItc2VsZWN0Om5vbmU7LW1zLXVzZXItc2VsZWN0Om5vbmU7dXNlci1zZWxlY3Q6bm9uZTtmb250LWZhbWlseTpcIk9wZW4gU2Fuc1wiLCBzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjYwMDtsaW5lLWhlaWdodDoxLjQyODU3MTQzO2NvbG9yOiNmZmY7dGV4dC1hbGlnbjpjZW50ZXI7d2hpdGUtc3BhY2U6bm93cmFwO2JhY2tncm91bmQ6I2VmNDkyNTtiYWNrZ3JvdW5kLWltYWdlOnVybChcImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQklBQUFBVkNBWUFBQUJMeTc3dkFBQUFCR2RCVFVFQUFMR1BDL3hoQlFBQUFKUkpSRUZVT0JITlVjRVdnQ0FJeTE0ZmJsOWVnSzVNUmFySFFTN29jQU5tT0NnV2gxZ2RORVJpZzFDZ3dQbEx4a1p1RTgwbmRIbFUrNExkYTF6ejBtMDFkU0t0Y3owaDdxcFFiN1dSK0h5cnFSUHhhaHp3d01xcWtFVnM2cW52Kzg2TlFBYmNKbEsvWCt2TWVNZTdYY0JPWWFSemNiSXRVUjcvOFFnY3lrbUVsUXJRUEVybm14TnhsMnl5aXdjZ0V2UVVvY0lKYUU2eUVSd3FYRElBQUFBQVNVVk9SSzVDWUlJPVwiKTtiYWNrZ3JvdW5kLXJlcGVhdDpuby1yZXBlYXQ7YmFja2dyb3VuZC1wb3NpdGlvbjoxNXB4IDZweDtib3JkZXI6MXB4IHNvbGlkIHRyYW5zcGFyZW50O2JvcmRlci1yYWRpdXM6MTdweH0uZnBfX2J0bjpob3ZlcntiYWNrZ3JvdW5kLWNvbG9yOiNkNjQ1MzN9LmZwX19idG46OmFmdGVye3Bvc2l0aW9uOmFic29sdXRlO2NvbnRlbnQ6XCJcIjt0b3A6MTVweDtyaWdodDoxNHB4O3dpZHRoOjdweDtoZWlnaHQ6NHB4O2JhY2tncm91bmQ6dXJsKFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBY0FBQUFJQ0FZQUFBQTFCT1VHQUFBQUJHZEJUVUVBQUxHUEMveGhCUUFBQUdsSlJFRlVDQjFqL1AvL3Z3NERBNE1pRUtPRCsweEFrYXRBL0FKTkJzUy95c1RJeVBnZnlEZ0h4TytoQ2tEME9hZzRSQWhvUERzUW00Tm9xQ0lHQmlCbkFoQmpBeE5Ba2t4QXZCWk5Gc1FIdVFlc214UElPUVpWQUtJNTRVWkRGWWdBQmJjQnNRaE1BZ0RJVkdZU3Fac242d0FBQUFCSlJVNUVya0pnZ2c9PVwiKTt9LmZwX19idG46aG92ZXI6OmFmdGVye2JhY2tncm91bmQtcG9zaXRpb246MCAtNHB4O30uZnBfX2J0bjphY3RpdmUsLmZwX19idG46Zm9jdXN7b3V0bGluZTpub25lfUBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1pbi0tbW96LWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAoLW8tbWluLWRldmljZS1waXhlbC1yYXRpbzogMiAvIDEpLCBvbmx5IHNjcmVlbiBhbmQgKC13ZWJraXQtbWluLWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAobWluLWRldmljZS1waXhlbC1yYXRpbzogMil7LmZwX19idG57YmFja2dyb3VuZC1pbWFnZTp1cmwoXCJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUNRQUFBQXFDQVlBQUFEYkN2bm9BQUFBQkdkQlRVRUFBTEdQQy94aEJRQUFBUUZKUkVGVVdBbnRXRUVTd2pBSWJCd2ZIbCt1cE5vUk5qS1VKaGs1a0l2WlFHRzdiSE93UEdsdGdkWXRFSmVkU2hLeUpuTEhoRUlMejFaaTlIQ096Rkk3RlVxRkxBV3NlRGdQZGZlUTlRWjRiMWo1M25zdG5FSkp5QnF4MjBOZVQxZ0VNQjV1Wkc2RnpuNWxWNVVNcDFBU1FoTWpkbnZvcWpld3NZYkRqY3l0RUg1bHN4VUxwMUFTMHN4OG5KZlZuamdhbmYzTmtWbEtoVlBJZlE5WmI2akYwYXRLM21OcmlYd3BpY1BIdklleXIzc1REQTUzVmdwZ0g4QnZNdTFaQ0N6N2V3LzdNUHdsRTRDUUpQTm5RajJaWDRTWWxFUGJWcHN2S0ZaNVRPd2hjUm9VVFFpd3doVmpBclBFcVZ2UmhNQ25lTVh6RGs5bHdZcGhJd3JaWk9paEYzMm9laE1BYTFxU0FBQUFBRWxGVGtTdVFtQ0NcIik7YmFja2dyb3VuZC1zaXplOjE4cHggMjFweH0uZnBfX2J0bjo6YWZ0ZXJ7YmFja2dyb3VuZDp1cmwoXCJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUE0QUFBQVFDQVlBQUFBbWxFNDZBQUFBQkdkQlRVRUFBTEdQQy94aEJRQUFBTnBKUkVGVUtCV1ZrVThLZ2xBWXhKL3UzSHVCd21VWDhCcWVwS040a2E0Umd1RE9WWXUyUVZDcmhJSjYvY2Fla3FMaUd4aStQelBENThQQVdyc3p4bXlnRDg0aDdocGVQRkx5MW1FUUJKYW1ndmNWWVhrcVpYVFIwTHdwSld3MHowQmE2YnltRGNySTRra3A0RXZ6Q05vVnp0TktmVkFUd29PaXl4L05EdXAxU1ZxUFFWQmJERGVLM3R4QmI5SnVIZmhOVzNIV2paaERYK1NHUkFnUEhrbDVmMCtraWVCeFJWaWVhUEQ1TEdKNFdnaExpd2VoYmtCSTRIVWlyRjNTK1NZcmhoUTJmMkgxNmFSNXZNU1l3YmRqTnRZWFowSjdjYzcwQlhuRk1ISUd6bnpFQUFBQUFFbEZUa1N1UW1DQ1wiKTtiYWNrZ3JvdW5kLXNpemU6N3B4IDhweDt9fSc7XG4gICAgICAgICAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdLCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgICAgIHN0eWxlLnR5cGUgPSBcInRleHQvY3NzXCI7XG4gICAgICAgICAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgICAgICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7fVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBjb25zdHJ1Y3RQaWNrV2lkZ2V0OiBjb25zdHJ1Y3RQaWNrV2lkZ2V0LFxuICAgICAgICBjb25zdHJ1Y3REcmFnV2lkZ2V0OiBjb25zdHJ1Y3REcmFnV2lkZ2V0LFxuICAgICAgICBjb25zdHJ1Y3RFeHBvcnRXaWRnZXQ6IGNvbnN0cnVjdEV4cG9ydFdpZGdldCxcbiAgICAgICAgYnVpbGRXaWRnZXRzOiBidWlsZFdpZGdldHMsXG4gICAgICAgIGNvbnN0cnVjdFdpZGdldDogY29uc3RydWN0V2lkZ2V0XG4gICAgfTtcbn0pO1xuXG5cInVzZSBzdHJpY3RcIjtcblxuKGZ1bmN0aW9uKCkge1xuICAgIGZpbGVwaWNrZXIuaW50ZXJuYWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBmcCA9IHRoaXM7XG4gICAgICAgIGZwLnV0aWwuYWRkT25Mb2FkKGZwLmNvb2tpZXMuY2hlY2tUaGlyZFBhcnR5KTtcbiAgICAgICAgZnAudXRpbC5hZGRPbkxvYWQoZnAud2lkZ2V0cy5idWlsZFdpZGdldHMpO1xuICAgICAgICBmcC51dGlsLmFkZE9uTG9hZChmcC5yZXNwb25zaXZlSW1hZ2VzLmFjdGl2YXRlKTtcbiAgICB9KTtcbiAgICBkZWxldGUgZmlsZXBpY2tlci5pbnRlcm5hbDtcbiAgICBkZWxldGUgZmlsZXBpY2tlci5leHRlbmQ7XG4gICAgdmFyIHF1ZXVlID0gZmlsZXBpY2tlci5fcXVldWUgfHwgW107XG4gICAgdmFyIGFyZ3M7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICBpZiAobGVuKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3MgPSBxdWV1ZVtpXTtcbiAgICAgICAgICAgIGZpbGVwaWNrZXJbYXJnc1swXV0uYXBwbHkoZmlsZXBpY2tlciwgYXJnc1sxXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGZpbGVwaWNrZXIuX3F1ZXVlKSB7XG4gICAgICAgIGRlbGV0ZSBmaWxlcGlja2VyLl9xdWV1ZTtcbiAgICB9XG59KSgpOyJdfQ==
