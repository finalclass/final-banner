/*jslint browser:true*/
/*global jQuery*/

(function () {
    'use strict';

    var $ = jQuery;

    /**
     * @author Szymon Wygnański (s@finalclass.net)
     * @license MIT (see LICENSE.txt)
     */


    // ----------------------------------------------------------------------------------
    // EventDispatcher
    // ----------------------------------------------------------------------------------

    /**
     *
     * @constructor
     */
    var EventDispatcher = function () {
        this.$dispatcher = $(this);
    };

    EventDispatcher.prototype = {
        on: function (eventType, callback) {
            this.$dispatcher.bind(eventType, callback);
        },
        emit: function (eventType, data) {
            this.$dispatcher.trigger(eventType, data);
        }
    };

    // ----------------------------------------------------------------------------------
    // Timer
    // ----------------------------------------------------------------------------------
    var Timer = function (interval) {
        EventDispatcher.call(this);
        this.interval = interval;
        this.tickCount = 0;
        this.id;
        this.isRunning = false;

        this.onTimer = $.proxy(this.onTimer, this);
    }

    Timer.TICK = 'tick';

    Timer.prototype = Object.create(EventDispatcher.prototype);
    $.extend(Timer.prototype, /** @lends Timer.prototype */ {

        start: function () {
            if (!this.isRunning) {
                this.id = setInterval(this.onTimer, this.interval);
                this.isRunning = true;
            }
        },

        stop: function () {
            clearInterval(this.id);
            this.isRunning = false;
        },

        onTimer: function () {
            this.tickCount += 1;
            this.emit(Timer.TICK, [this.tickCount]);
        }
    });

    // ----------------------------------------------------------------------------------
    // ImagesLoader
    // ----------------------------------------------------------------------------------

    /**
     *
     * @constructor
     */
    var ImagesLoader = function () {
        EventDispatcher.call(this);
        this.onImageLoaded = $.proxy(this.onImageLoaded, this);
        this.imagesToLoad = 0;
        this.loadedImages = [];
    };

    ImagesLoader.COMPLETE = 'complete';
    ImagesLoader.PROGRESS = 'progress';

    ImagesLoader.prototype = Object.create(EventDispatcher.prototype);
    $.extend(ImagesLoader.prototype, /** @lends ImagesLoader.prototype */ {

        load: function (array, directory) {
            var i, img;

            this.imagesToLoad += array.length;
            for (i = 0; i < array.length; i += 1) {
                img = $('<img/>').attr('src', directory + array[i]);
                img.bind('load', this.onImageLoaded);
            }
        },

        onImageLoaded: function (event) {
            this.loadedImages.push(event.target);

            if (this.imagesToLoad === this.loadedImages.length) {
                this.emit(ImagesLoader.COMPLETE, [this.loadedImages]);
            } else {
                this.emit(ImagesLoader.PROGRESS, [this.loadedImages.length / this.imagesToLoad]);
            }
        }

    });

    // ----------------------------------------------------------------------------------
    // BannerSlideAnimation
    // ----------------------------------------------------------------------------------

    /**
     *
     * @param {CanvasRenderingContext2D} context1
     * @param {CanvasRenderingContext2D} context2
     * @constructor
     * @param {number} height
     * @param {number} width
     * @param {number} speed
     * @param {number} direction +1 or -1
     */
    var BannerSlideAnimation = function (context1, context2, width, height, speed, direction) {
        EventDispatcher.call(this);
        this.context1 = context1;
        this.context2 = context2;
        this.direction = direction || +1;
        this.speed = speed || 50;
        this.width = width;
        this.height = height;
        this.data1 = this.context1.getImageData(0, 0, width, height);
        this.data2 = this.context2.getImageData(0, 0, width, height);
        this.pos = 0;
        this.timer = new Timer(20);
        this.isRunning = false;
        this.onTick = $.proxy(this.onTick, this);

        this.timer.on(Timer.TICK, this.onTick);
    };

    BannerSlideAnimation.TICK = 'tick';
    BannerSlideAnimation.COMPLETE = 'complete';

    BannerSlideAnimation.prototype = Object.create(EventDispatcher.prototype);
    $.extend(BannerSlideAnimation.prototype, /** lends BannerAnimation.prototype */ {

        start: function () {
            this.pos = 0;
            this.isRunning = true;
            this.timer.start();
        },

        onTick: function (event, tickCount) {
            var i,
                x,
                y,
                w = this.width,
                h = this.height,
                tr,
                p,
                data = this.context1.createImageData(this.width, this.height),
                d = data.data,
                q,
                d1,
                d2;

            if (this.direction > 0) {
                p = w - this.pos;
                d1 = this.data1.data,
                    d2 = this.data2.data;
                q = 0;
            } else {
                p = this.pos;
                q = w * 4;
                d2 = this.data1.data,
                    d1 = this.data2.data;
            }

            for (x = 0; x < w; x += 1) {
                for (y = 0; y < h; y += 1) {
                    if (x < p) {
                        i = (y * w + x) * 4;
                        tr = this.direction * this.pos * 4 + q;
                        d[i]       = d1[i + tr];
                        d[i + 1]   = d1[i + tr + 1];
                        d[i + 2]   = d1[i + tr + 2];
                        d[i + 3]   = d1[i + tr + 3];
                    } else {
                        i = (y * w + x) * 4;
                        tr = -p * 4;
                        d[i]       = d2[i + tr];
                        d[i + 1]   = d2[i + tr + 1];
                        d[i + 2]   = d2[i + tr + 2];
                        d[i + 3]   = d2[i + tr + 3];
                    }
                }
            }

            this.emit(BannerSlideAnimation.TICK, [data]);

            this.pos += this.speed;
            if (this.pos > w) {
                this.isRunning = false;
                this.timer.stop();
                this.emit(BannerSlideAnimation.COMPLETE);
            }
        }

    });


    // ----------------------------------------------------------------------------------
    // Banner
    // ----------------------------------------------------------------------------------

    /**
     *
     * @constructor
     */
    var FinalBanner = function ($container, switchTime, animationSpeed) {
        this.$container = $container;
        this.animationSpeed = animationSpeed;
        this.$prev = $('<div class="banner-prev-image"></div>');
        this.$next = $('<div class="banner-next-image"></div>');
        this.canvas = $('<canvas/>')[0];
        this.canvas.width = $container.width();
        this.canvas.height = $container.height();
        this.ctx = this.canvas.getContext('2d');
        this.timer = new Timer(switchTime);
        this.images = [];
        this.position = 0;
        this.animation = undefined;

        this.onImagesLoadComplete = $.proxy(this.onImagesLoadComplete, this);
        this.onTimer = $.proxy(this.onTimer, this);
        this.onNextClick = $.proxy(this.onNextClick, this);
        this.onPrevClick = $.proxy(this.onPrevClick, this);
        this.onAnimationTick = $.proxy(this.onAnimationTick, this);
        this.onAnimationComplete = $.proxy(this.onAnimationComplete, this);

        this.$prev.bind('click', this.onPrevClick);
        this.$next.bind('click', this.onNextClick);
        this.timer.on(Timer.TICK,  this.onTimer);

        this.canvas.width = $container.width();
        this.canvas.height = $container.height();
    };

    FinalBanner.prototype = {

        animate: function (paths, pathsPrefix) {
            var loader = new ImagesLoader();

            loader.load(paths, pathsPrefix);
            loader.on(ImagesLoader.COMPLETE, this.onImagesLoadComplete);
        },

        showCurrentImage: function () {
            this.ctx.drawImage(this.images[this.position], 0, 0, this.canvas.width, this.canvas.height);
        },

        getImageAsContext: function (image) {
            var canvas = $('<canvas/>')[0],
                ctx;

            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            ctx = canvas.getContext('2d')
            ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);

            return ctx;
        },

        animatedPhotosSwitch: function (imgPos1, imgPos2, direction) {
            var ctx1, ctx2;

            ctx1 = this.getImageAsContext(this.images[imgPos1]);
            ctx2 = this.getImageAsContext(this.images[imgPos2]);

            this.animation = new BannerSlideAnimation(
                ctx1,
                ctx2,
                this.canvas.width,
                this.canvas.height,
                this.animationSpeed,
                direction
            );
            this.animation.on(BannerSlideAnimation.COMPLETE, this.onAnimationComplete);
            this.animation.on(BannerSlideAnimation.TICK, this.onAnimationTick);
            this.animation.start();
            this.notifyImageChange();
        },

        setPosition: function (pos) {
            var pos1, pos2, wasRunning = this.timer.isRunning;

            if (this.animation && this.animation.isRunning) {
                return;
            }

            pos1 = this.position;
            this.position = (pos) % (this.images.length);
            pos2 = this.position;
            this.stop();
            if (wasRunning) {
                this.start();
            }
            this.animatedPhotosSwitch(pos1, pos2, +1);
        },

        stop: function () {
            this.timer.stop();
        },

        start: function () {
            this.timer.start();
        },

        showNextImage: function () {
            var pos1, pos2;

            if (this.animation && this.animation.isRunning) {
                return;
            }

            pos1 = this.position;
            this.position = (this.position + 1) % (this.images.length);
            pos2 = this.position;

            this.animatedPhotosSwitch(pos1, pos2, +1);
        },

        showPrevImage: function () {
            var pos1, pos2;

            if (this.animation && this.animation.isRunning) {
                return;
            }

            pos1 = this.position;
            this.position = (this.position - 1) % (this.images.length);

            if (this.position < 0) {
                this.position = this.images.length + this.position;
            }
            pos2 = this.position;

            if (this.position < 0) {
                this.position = this.images.length + this.position;
            }

            this.animatedPhotosSwitch(pos1, pos2, -1);
        },

        isSupported: function () {
            var elem = document.createElement('canvas');
            return !!(elem.getContext && elem.getContext('2d'));
        },

        notifyImageChange: function () {
            this.$container.trigger('bannerChange', [this.position]);
        },

        // -------------------------------------------------------------
        //
        // Event Handlers
        //
        // -------------------------------------------------------------

        onImagesLoadComplete: function (event, imagesArray) {
            this.images = this.images.concat(imagesArray);
            this.timer.start();

            this.$container.empty()
                .append(this.$prev)
                .append(this.$next)
                .append(this.canvas);

            this.showCurrentImage();
        },

        onNextClick: function (event) {
            var wasRunning = this.timer.isRunning;

            this.stop();
            this.showNextImage();
            if (wasRunning) {
                this.start();
            }
        },

        onPrevClick: function (event) {
            var wasRunning = this.timer.isRunning;

            this.stop();
            this.showPrevImage();
            if (wasRunning) {
                this.start();
            }
        },

        onTimer: function (event, tickCount) {
            this.showNextImage();
        },

        onAnimationComplete: function (event) {
            this.showCurrentImage();
        },

        onAnimationTick: function (event, imgData) {
            this.ctx.putImageData(imgData, 0, 0);
        }

    };


    /**
     * Let it be visible in global scope
     */
    window.FinalBanner = FinalBanner;

    /**
     * JQuery Plugin
     */
    $.fn.finalBanner = function( options ) {

        var settings, method, args;

        if (typeof options === 'string') {
            method = options;
            args = Array.prototype.slice.call(arguments, [1]); //remove first argument (method name)
        } else {
            settings = $.extend( {
                switchTime: 5000,
                animationSpeed: 100,
                pathsPrefix: '',
                paths: []
            }, options);
        }

        return this.each(function() {
            var $this = $(this),
                banner;

            if (method !== undefined) {
                banner = $this.data('finalBanner');
                if (banner.isSupported()) {
                    banner[method].call(banner, args);
                }
                return $this;
            }

            if ($this.data('finalBanner') !== undefined) {
                return;
            }

            banner = new FinalBanner($(this), settings.switchTime, settings.animationSpeed);

            if (banner.isSupported()) {
                banner.animate(settings.paths, settings.pathsPrefix);
                $this.data('finalBanner', banner);
            }
            return $this;
        });

    };

})();