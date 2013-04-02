# FinalBanner

FinalBanner is simple html5 banner class;

Also available as jQuery plugin

**See index.html for example usage**

## Common use case

    /**
     * Create animated banner
     */
    $('.banner').finalBanner({
        switchTime: 2000,
        animationSpeed: 100,
        paths: ['1.jpg', '2.jpg'],
        pathsPrefix: 'img/banner/'
    });

    $('#stop').click(function () {
        $('.banner').finalBanner('stop');
    });

    $('#start').click(function () {
        $('.banner').finalBanner('start');
    });