// ----------------------------------------------------------------------------------
// ON DOCUMENT LOAD
// ----------------------------------------------------------------------------------

$(function () {

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
    })

});

