/* sim.js — trip-optimizer simulation (static placeholder until Task 4) */
(function () {
    'use strict';

    var canvas = document.getElementById('sim-canvas');
    if (!canvas) return;

    function draw() {
        var dpr = window.devicePixelRatio || 1;
        var w = canvas.clientWidth;
        var h = canvas.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(154,168,188,0.12)';
        ctx.lineWidth = 1;
        var step = 38;
        for (var x = step; x < w; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (var y = step; y < h; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }

    draw();
    window.addEventListener('resize', draw);
})();
