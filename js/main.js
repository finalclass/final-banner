// ----------------------------------------------------------------------------------
// ON DOCUMENT LOAD
// ----------------------------------------------------------------------------------

$(function () {

    /**
     * Create animated banner
     */
    $('.banner').each(function () {
        var banner = new Banner($(this), 5000, 100);

        if (banner.isSupported) {
            banner.animate(['1.jpg', '2.jpg'],'img/banner/');
        }

    });

});

