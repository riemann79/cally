(function ($) {
    /*
     * Cally
     * v0.5.2
     *
     * Cally supports different flavours of asynchronous POST requests to the server.
     * Use it to load data or markup on the client side, while keeping users informed on what's going on.
     *
     * Requires: 
     *    jQuery
     *    Bootstrap
     *    AntiForgeryToken library
     *    Toastr
     * 
     */

    var Ajax = function (node, opts) {
        this.node = node;
        this.$node = $(node);

        var defaults = {
            data: {}
        };

        /* 
         POST data includes the anti-forgery token, if present.
         Requires the ajaxAntiForgery.js library.
         */
        if ($.getAntiForgeryToken instanceof Function) {
            var antiForgeryToken = $.getAntiForgeryToken();

            if (antiForgeryToken) {
                $.extend(defaults.data, { '__RequestVerificationToken': antiForgeryToken.value });
            }
        }

        this.options = $.extend(defaults, opts);
        this.loadErrorTemplate = $(Templates.loadingFailed).clone().show();
        this.loadIndicatorTemplate = $(Templates.loadIndicator).clone().show();
        this.modalDialog = $(Templates.modalDialog).clone().show().modal({
            show: false,
            keyboard: false,
            backdrop: false
        });

        this.mode = this.options.mode || this.$node.data("mode");

        this.notifyStrategy = null;

        switch(this.mode) {
            case "html":
                this.notifyStrategy = this.htmlInjectionStrategy(this.options);
                break;
            case "html-replace":
                this.notifyStrategy = this.htmlReplaceNotifyStrategy(this.options);
                break;
            case "modal":
                this.notifyStrategy = this.modalNotifyStrategy(this.options);
                break;
            case "silent":
                this.notifyStrategy = this.silentNotifyStrategy(this.options);
                break;
            case "custom":
                this.notifyStrategy = {
                    loading: this.options.loading || function () { },
                    done: this.options.done || function () { },
                    retry: this.options.retry || function () { }
                };
                break;
            default:
                this.notifyStrategy = this.nonBlockingNotifyStrategy(this.options);
                break;
        }
    };

    Ajax.prototype = {
        constructor: Ajax,

        onHtmlLoaded: function(rootNode) {
            setup(rootNode);
        },

        silentNotifyStrategy: function() {
            var constructor = function() {

            }

            constructor.prototype = {
                done: function() {},
                loading: function() {},
                retry: function() {}
            }

            return new constructor();
        },

        modalNotifyStrategy: function() {
            var t = this;

            var constructor = function() {
                this.$node = $(t.node);
                this.options = t.options;
                this.modalDialog = t.modalDialog;
                this.loadErrorTemplate = t.loadErrorTemplate;
            }

            constructor.prototype = {
                done: function(message, data) {
                    this.modalDialog.find('.modal-body').html(message);

                    /*
                     Delay the closing of the modal dialog, so the user
                     can clearly see the result of the operation.
                     */
                    window.setTimeout(this.hideModal, 2000);

                    if (options.done instanceof Function) {
                        options.done(data);
                    }
                },

                loading: function() {
                    this.modalDialog.find('.modal-body').html(this.$node.data('msg'));
                    this.modalDialog.find('.modal-header').hide();
                    this.modalDialog.modal('show');
                },

                retry: function() {
                    this.modalDialog.find('.modal-header').show();
                    this.modalDialog.find('.modal-body').html(this.loadErrorTemplate);
                    this.modalDialog.modal('show');
                },

                hideModal: function() {
                    t.modalDialog.modal('hide');
                }
            }

            return new constructor();
        },

        nonBlockingNotifyStrategy: function(options) {
            var t = this;

            var constructor = function () {
                this.$node = $(t.node);
                this.modalDialog = t.modalDialog;
                this.loadErrorTemplate = t.loadErrorTemplate;
            }

            constructor.prototype = {
                done: function (message, data) {
                    toastr.clear();
                    toastr.success(message);

                    if (options.done instanceof Function) {
                        options.done(data);
                    }
                },

                loading: function () {
                    var message = this.$node.data('msg') || 'Loading...';

                    toastr.info(message);
                },

                retry: function () {
                    toastr.clear();

                    this.modalDialog.find('.modal-header').show();
                    this.modalDialog.find('.modal-body').html(this.loadErrorTemplate);
                    this.modalDialog.modal('show');
                }
            }

            return new constructor();
        },

        htmlInjectionStrategy: function() {
            var t = this;

            var constructor = function () {
                this.$node = $(t.node);
                this.$contents = $(t.options.contents ||
                    this.$node.data('contents') ||
                    this.$node.closest('.ajax-container').find('.contents'));
                this.loadErrorTemplate = t.loadErrorTemplate;
                this.loadIndicatorTemplate = t.loadIndicatorTemplate;
                this.onHtmlLoaded = t.onHtmlLoaded;
            }

            constructor.prototype = {
                done: function (message, data) {
                    this.$contents.html(data.Html);
                    this.onHtmlLoaded(this.$contents);

                    if (options.done instanceof Function) {
                        options.done(data);
                    }
                },

                loading: function () {
                    this.$contents.html(this.loadIndicatorTemplate);
                },

                retry: function () {
                    this.$contents.html(this.loadErrorTemplate);
                }
            }

            return new constructor();
        },

        // todo: not needed (use mode=html and surround the element with .contents)
        htmlReplaceNotifyStrategy: function() {
            var t = this;

            var constructor = function () {
                this.$node = $(t.node);
                this.$contents = $(this.$node.closest('.ajax-container') || this.$node.parent);
                this.loadErrorTemplate = t.loadErrorTemplate;
                this.loadIndicatorTemplate = t.loadIndicatorTemplate;
                this.onHtmlLoaded = t.onHtmlLoaded;
            }

            constructor.prototype = {
                done: function (message, data) {
                    this.$contents.html(data.Html);
                    this.onHtmlLoaded(this.$contents);

                    if (options.done instanceof Function) {
                        options.done(data);
                    }
                },

                loading: function () {
                    this.$contents.html(this.loadIndicatorTemplate);
                },

                retry: function () {
                    this.$contents.html(this.loadErrorTemplate);
                }
            }

            return new constructor();
        },

        /*
         Starts an Ajax operation when an event is raised by an element
         (click event by default).

         During the operation, the element is disabled and a modal
         indicator is shown. If the operation fails, an error template
         is displayed, allowing the user to retry the operation.
         */
        callOnEvent: function () {
            var options = this.options;
            var event = this.options.event || this.$node.data('event') || 'click';
            var optionsData = this.options.data;
            var node = this.node;
            var loadErrorTemplate = this.loadErrorTemplate;
            var notifier = this.notifyStrategy;

            if (event === 'ready') {
                doLoad();
            } else {
                $(this.node).on(event, function() {
                    doLoad();
                });
            }

            function doLoad() {

                // Give a last chance to prevent the operation from running.
                if (options.shouldProceed instanceof Function) {
                    if (options.shouldProceed() === false) {
                        return;
                    }
                }

                // Should we make a single call?
                var dataOnce = $(node).data('once') === '';
                var dataLoaded = $(node).data('loaded') === '';

                if (dataOnce && dataLoaded) {
                    return;
                }

                // Add form data, if any.
                var formData = {};
                var form = $(node).closest('form,.ajax-container').find('select, textarea, input');

                $.each(form.serializeArray(), function (_, kv) {
                    if (formData.hasOwnProperty(kv.name)) {
                        formData[kv.name] = $.makeArray(formData[kv.name]);
                        formData[kv.name].push(kv.value);
                    }
                    else {
                        formData[kv.name] = kv.value;
                    }
                });

                var postData = $.extend(optionsData, formData);

                // Request any additional post data that need to be evaluated at runtime.
                if (options.getPostData instanceof Function) {
                    postData = $.extend(optionsData, options.getPostData());
                }

                // Operation starts.
                disableElement();
                notifier.loading();

                var operation = $.ajax({
                    type: 'POST',
                    url: $(node).data('url') || options.url,
                    data: postData,
                    traditional: true // Some frameworks, such as ASP.NET MVC, use this kind of param serialization.
                    // See: http://api.jquery.com/jQuery.param/
                });

                operation.fail(function () {
                    showErrorAndRetry();
                });

                operation.done(function (data) {
                    $(node).attr('data-loaded', '');

                    /* 
                     The message to display in the modal popup when the
                     operation succeeds can be specified in the data-done-msg attribute.
                     */
                    var message = $(node).data('done-msg') || "Done.";

                    notifier.done(message, data);
                });

                operation.always(function () {
                    // Delay the enabling of the element, to discourage flooding.
                    window.setTimeout(enableElement, 1000);
                });

                function showErrorAndRetry() {
                    notifier.retry();

                    loadErrorTemplate.find('.load-retry').one('click', function () {
                        doLoad();
                    });
                }

                function disableElement() {
                    $(node).attr('disabled', 'disabled');
                }

                function enableElement() {
                    $(node).removeAttr('disabled');
                }

            };
        }
    };

    $.fn.extend({

        callOnEvent: function (options) {

            return this.each(function () {

                (new Ajax(this, options)).callOnEvent();

            });

        },

        callOnClick: function (options) {

            return this.each(function () {

                (new Ajax(this, options)).callOnEvent();

            });

        },

        callOnLoad: function (options) {

            $.extend(options, { event: 'ready' });

            return this.each(function () {

                (new Ajax(this, options)).callOnLoad();

            });

        }

    });

    // Templates
    var Templates = {
        modalDialog: [
            '<div style="display:none" class="modal">',
            '   <div class="modal-dialog">',
            '      <div class="modal-content">',
            '         <div class="modal-header" style="display:none">',
            '            <span class="header-content">Error</span>',
            '            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>',
            '         </div>',
            '         <div class="modal-body">Working...</div>',
            '      </div>',
            '   </div>',
            '</div>'
        ].join(''),

        loadIndicator: [
            '<div style="display:none" class="load-indicator load-indicator-big"></div>'
        ].join(''),

        loadingFailed: [
            '<div style="display:none" class="alert alert-danger load-error">',
            '   <span>Loading failed&nbsp;</span>',
            '   <button class="btn btn-danger load-retry">Retry</button>',
            '</div>'
        ].join('')
    };

    var setup = function (rootNode) {
        rootNode.find('.call-on-load').callOnLoad();
        rootNode.find('.call-on-click').callOnClick();
    };

    $(document).ready(function () {
        setup($(document));
    });

})(jQuery);