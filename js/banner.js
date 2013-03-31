/*jslint browser:true*/
/*global $*/

(function () {
    'use strict';

    /**
     * @author Szymon Wygnański (s@finalclass.net)
     * @license MIT
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

        this.onTimer = $.proxy(this.onTimer, this);
    }

    Timer.TICK = 'tick';

    Timer.prototype = Object.create(EventDispatcher.prototype);
    $.extend(Timer.prototype, /** @lends Timer.prototype */ {

        start: function () {
            this.id = setInterval(this.onTimer, this.interval);
        },

        stop: function () {
            clearInterval(this.id);
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
    var Banner = function ($container, switchTime, animationSpeed) {
        this.$container = $container;
        this.animationSpeed = animationSpeed;
        this.$prev = $('<div class="banner-prev-image"></div>');
        this.$next = $('<div class="banner-next-image"></div>');
        this.canvas = $('<canvas/>')[0];
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

        this.canvas.width = 926;
        this.canvas.height = 238;
    };

    Banner.prototype = {

        animate: function (array, directory) {
            var loader = new ImagesLoader();

            loader.load(array, directory);
            loader.on(ImagesLoader.COMPLETE, this.onImagesLoadComplete);
        },

        onImagesLoadComplete: function (event, imagesArray) {
            this.images = this.images.concat(imagesArray);
            this.timer.start();

            this.$container.empty()
                .append(this.$prev)
                .append(this.$next)
                .append(this.canvas);

            this.showCurrentImage();
        },

        onTimer: function (event, tickCount) {
            this.showNextImage();
        },

        onAnimationComplete: function (event) {
            this.showCurrentImage();
        },

        onAnimationTick: function (event, imgData) {
            this.ctx.putImageData(imgData, 0, 0);
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

        onNextClick: function (event) {
            this.timer.stop();
            this.showNextImage();
            this.timer.start();
        },

        onPrevClick: function (event) {
            this.timer.stop();
            this.showPrevImage();
            this.timer.start();
        },

        isSupported: function () {
            var elem = document.createElement('canvas');
            return !!(elem.getContext && elem.getContext('2d'));
        }

    };

    window.Banner = Banner;

})();