(function(jq, win) {
    var s = win.PlayerSettings = {
        showFPSMeter: true,
        musicDir: "./music/",
        heatBonus: {
            multiplier: 1,
            maxWaveMult: 0.5,
            avgWaveMult: 0.5,
            bounce: {
                radius: 80,
                smoothness: 10
            },
            circleRadius: 0.6, // base + heat
            whiteness: 0.8, // x 256, maximum 100, globalCompositeOperation lighter
            particleSpeed: 200,
            zoomIn: 1.5
        },
        circle: {
            show: true,
            image: "./assets/test.png",
            color: "#FFF",
            radius: 0.3
        },
        wavelengths: {
            read: 64,
            show: 64,
            zeroSpace: 0,
            mirrorY: true,
            analyzer: {
                FFTSize: 16384,
                smoothingTimeConstant: 0.1,
                minDecibels: -50,
                maxDecibels: 30
            },
            waveSpectrum: [
                /*{ color: "#FFF", size: 2.0, ticksBehind: 0, smoothness: 0 }*/
                { color: "#FFF", size: 2.0, ticksBehind: 0, smoothness: 0.05 },
                { color: "#FF0", size: 2.0, ticksBehind: 1, smoothness: 0.055 },
                { color: "#FFA500", size: 2.0, ticksBehind: 1, smoothness: 0.06 },
                { color: "#F00", size: 2.0, ticksBehind: 1, smoothness: 0.07 },
                { color: "#F0F", size: 2.0, ticksBehind: 1, smoothness: 0.075 },
                { color: "#C71585", size: 2.0, ticksBehind: 1, smoothness: 0.08 },
                { color: "#00F", size: 2.0, ticksBehind: 1, smoothness: 0.09 },
                { color: "#0F0", size: 2.0, ticksBehind: 1, smoothness: 0.1 },
            ]
        },
        particles: {
            blur: 20,
            is3D: true,
            mirrorX: false,
            mirrorY: true,
            minOpacity: 0,
            maxOpacity: 1,
            minSize: 1,
            maxSize: 5,
            speed: 1,
            color: "#FFF",
            count: 500
        },
        background: {
            show: true,
            image: "./assets/images.duckduckgo.jpg",
            mirrorY: true,
        }
    }
    win.Reload = function() {
        if (!s.circle.show) loadBg();
        else loadImg();
        mainCanvas = document.getElementById("canvas");
        mainCtx = mainCanvas.getContext("2d");
        audio.elem = new Audio();
        audio.elem.onended = loadMusic;
        audio.ctx = new win.AudioContext();
        audio.src = audio.ctx.createMediaElementSource(audio.elem);
        audio.analyzer = audio.ctx.createAnalyser();
        audio.src.connect(audio.analyzer);
        audio.src.connect(audio.ctx.destination);
        audio.analyzer.fftSize = s.wavelengths.analyzer.FFTSize;
        audio.analyzer.smoothingTimeConstant = s.wavelengths.analyzer.smoothingTimeConstant;
        audio.analyzer.maxDecibels = s.wavelengths.analyzer.maxDecibels;
        audio.analyzer.minDecibels = s.wavelengths.analyzer.minDecibels;
        wavelengthSizes = new Uint8Array(s.wavelengths.read || 128);
        win.requestAnimationFrame(draw);
        win.onresize = onResize;
        win.onmousemove = onMouseMove;
        win.onclick = onClick;
        mainCanvas.focus();
        onResize();
    };
    var keepSideOpen = false;
    var isOpen = false;
    function onMouseMove(event) {
        var x = event.clientX;
        var y = event.clientY;
        if (x < w - 600) {
            if (!isOpen) return;
            isOpen = false;
            $("#popDiv").css({
                right: "-300px"
            });
        } else {
            isOpen = true;
            $("#popDiv").css({
                right: Math.min(300 + x - w, 0) + "px"
            });
        }
    }
    function onClick() {

    }
    var state = 0; // 0 - downloading, 1 - playing, 2 - paused
    var audio = { elem: null, ctx: null, src: null, analyzer: null };
    var wavelengthSizes = null;
    var bars = [];
    var particles = [];
    var heat = {
        val: 0,
        radius: 0,
        particleSpeed: 0,
        whiteness: "#000",
        x: 0,
        y: 0
    };
    var circleImage = new Image;
    var backgroundImage = new Image;
    var background = null;
    var mainCanvas, mainCtx;

    function loadImg() {
        console.debug("Loading circle image");
        circleImage.src = s.circle.image;
        circleImage.onload = loadBg;
    }
    function loadBg() {
        if (!s.background.show) playNew();
        console.debug("Loading background image");
        backgroundImage.src = s.background.image;
        backgroundImage.onload = renderBg;
    }
    function renderBg() {
        console.debug("Rendering background image");
        var canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        var ctx = canvas.getContext("2d");
        var img = backgroundImage;
        if (s.background.mirrorY) {
            ctx.drawImage(img, 0, 0, img.width / 2, img.height, 0, 0, canvas.width / 2, canvas.height);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, img.width / 2, img.height, -canvas.width, 0, canvas.width / 2, canvas.height);
        } else {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
        }
        background = canvas;
        if (!isPlaying) loadMusic();
    }
    var isPlaying = false;
    var nowPlaying = "";
    var songsPlayed = [];
    function loadMusic() {
        if (nowPlaying.lenth) songsPlayed.push(nowPlaying);
        nowPlaying = "";
        console.debug("AJAXing next song");
        startTime = Date.now();
        state = 0;
        jq.ajax("./listmusic.php?dir=" + encodeURIComponent(s.musicDir), {
            complete: begin
        });
    }
    function begin(data) {
        startTime = Date.now();
        var a = JSON.parse(data.responseText);
        a = a.filter(function(str) {
            var spl = str.split(".");
            return ["mp3", "wav", "ogg"].indexOf(spl[spl.length - 1]) !== -1;
        }).sort(function() {
            return Math.random() - .5;
        });
        audio.elem.src = a[0];
        audio.elem.play();
        var spl = a[0].split(".");
        spl.pop();
        nowPlaying = spl.join(".").replace(s.musicDir, "");
        $("#playingSong").html(nowPlaying);
        state = 1;
        isPlaying = true;
    }

    var _scale, w, h, radius = 540, startTime;
    function onResize() {
        w = mainCanvas.width = win.innerWidth;
        h = mainCanvas.height = win.innerHeight;
        _scale = Math.max(w / 1920, h / 1080);
    }
    function draw() {
        mainCtx.save();
        mainCtx.fillStyle = "#000";
        mainCtx.fillRect(0, 0, w, h);
    
        mainCtx.translate(w / 2, h / 2);
        mainCtx.scale(_scale, _scale);

        if (state === 0) drawLoading();
        else {
            if (Date.now() - startTime < 1000) {
                mainCtx.globalAlpha = (1000 - (Date.now() - startTime)) / 1000;
                drawLoading();
                mainCtx.globalAlpha = (Date.now() - startTime) / 1000;
                drawPlayer();
            } else drawPlayer();
        }
        mainCtx.restore();
        win.requestAnimationFrame(draw);
    }
    function drawLoading() {
        mainCtx.textAlign = "center";
        mainCtx.textBaseline = "middle";
        mainCtx.font = "132px Questrial";
        mainCtx.fillStyle = "#FFF";
        var a;
        if (state === 1 && Date.now() - startTime > 3000) a = "Loaded";
        else if (!circleImage.complete) a = "Loading circle image";
        else if (!backgroundImage.complete) a = "Loading background";
        else if (!background) a = "Rendering background";
        else a = "Requesting next song";
        mainCtx.fillText(a, 0, 0);
        if (state === 0 && Date.now() - startTime > 10000) {
            mainCtx.font = "24px Questrial";
            mainCtx.fillText("If it keeps getting stuck, check the server status, your connectivity and the console output.", 0, 96);
        }
        mainCtx.font = "18px Questrial";
        mainCtx.fillStyle = "#444";
        mainCtx.textAlign = "left";
        mainCtx.textBaseline = "bottom";
        mainCtx.fillText("TopoR", -w / 2 / _scale, h / 2 / _scale);
    }
    function drawPlayer() {
        analyzeStep();
        animateParticles();

        if (s.background.show) {
            mainCtx.imageSmoothingEnabled = true;
            mainCtx.imageSmoothingQuality = "high";
            mainCtx.drawImage(background, -1920 / 2, -1080 / 2, 1920, 1080);
        }

        mainCtx.save();
        mainCtx.globalCompositeOperation = "lighter";
        mainCtx.fillStyle = "#" + heat.whiteness + heat.whiteness + heat.whiteness;
        mainCtx.fillRect(-1920 / 2, -1080 / 2, 1920, 1080);
        mainCtx.restore();

        for (var i = 0; i < particles.length; i++)
            drawParticle(particles[i]);

        mainCtx.translate(heat.x, heat.y);

        for (var i = s.wavelengths.waveSpectrum.length - 1; i >= 0; i--)
            drawBars(i);
        
        if (s.circle.show) {
            mainCtx.beginPath();
            mainCtx.save();
            mainCtx.arc(0, 0, heat.radius, 0, 2 * Math.PI, false);
            mainCtx.clip();
            mainCtx.drawImage(circleImage, 0, 0, circleImage.width, circleImage.height, -heat.radius, -heat.radius, 2 * heat.radius, 2 * heat.radius);
            mainCtx.closePath();
            mainCtx.restore();
        }

        var lenS = ~~audio.elem.duration % 60;
        var len = ((~~audio.elem.duration - lenS) / 60) + ":" + ("00" + lenS).slice(-2);
        var curS = ~~audio.elem.currentTime % 60;
        var cur = ((~~audio.elem.currentTime - curS) / 60) + ":" + ("00" + curS).slice(-2);
        $("#songSeek").html(cur + " / " + len);
    }
    function drawBars(index) {
        var sConf = s.wavelengths.waveSpectrum[index];
        if (bars.length <= sConf.ticksBehind) return;
        var l = s.wavelengths.read;
        if (s.wavelengths.mirrorY) l *= 2;
        mainCtx.fillStyle = sConf.color;

        var draw = processBars(index);
        mainCtx.beginPath();
        for (var i = 0, l = draw.length; i < l; i++)
            lineTo(draw[i].x, draw[i].y);
        mainCtx.closePath();
        mainCtx.fill();
    }
    function moveTo(x, y) { mainCtx.moveTo(x, y); }
    function lineTo(x, y) { mainCtx.lineTo(x, y); }
    function processBars(index) {
        // Scale, nearest-neighbor algorithm
        var mirror = s.wavelengths.mirrorY;
        var copy = bars[s.wavelengths.waveSpectrum[index].ticksBehind];
        var s1 = s.wavelengths.read * (1 + mirror);
        var s2 = s.wavelengths.show * (1 + mirror);
        var ret1 = [];
        var ret2 = [];
        var reach = s1 / s2;
        var i = 0;
        var frac = 0;
        while (i < s1) {
            frac += reach;
            ret1.push(copy[i]);
            while (frac >= 1) {
                frac--;
                i++;
                for (var j = 0; j < s.wavelengths.zeroSpace; j++)
                    ret1.push(0);
                s2 += s.wavelengths.zeroSpace;
            }
        }
        // Normalize and adjust to drawing X and Y
        var smoothness = ~~(s.wavelengths.waveSpectrum[index].smoothness * s.wavelengths.show);
        var sum, left, right, leftPad, rightPad, div, sin, cos, size, inc = 2 * Math.PI / s2, j;
        var remainRadius = radius - heat.radius;
        for (i = 0; i < s2; i++) {
            sum = ret1[i] / 2;
            left = Math.max(i - smoothness, 0);
            leftPad = i - left;
            div = 2;
            for (j = 1; j < leftPad; j++)
                sum += ret1[i - j] / (div *= 2);
            right = Math.min(i + smoothness, ret1.length - 1);
            rightPad = right - i;
            div = 2;
            for (j = 1; j < rightPad; j++)
                sum += ret1[i + j] / (div *= 2);
            sum = Math.min(sum, 1);

            sin = Math.sin(i * inc);
            cos = Math.cos(i * inc);
            size = heat.radius + sum * remainRadius * s.wavelengths.waveSpectrum[index].size;
            ret2.push({
                x: sin * size,
                y: cos * size
            });
        }
        return ret2;
    }
    var particleImage, particleRadius;
    function renderParticle() {
        particleImage = document.createElement("canvas");
        var ctx = particleImage.getContext("2d");
        particleRadius = particleImage.width = particleImage.height = 40 + 2 * s.particles.blur;
        ctx.fillStyle = ctx.shadowColor = s.particles.color;
        ctx.shadowBlur = s.particles.blur;
        ctx.translate(particleRadius / 2, particleRadius / 2);
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2, false);
        for (var i = 0; i <= s.particles.blur; i++)
            ctx.fill();
        ctx.closePath();
    }
    function drawParticle(particle) {
        if (!particleImage) renderParticle();
        mainCtx.save();
        mainCtx.globalAlpha = particle.opacity;
        var sz = particle.dSize;
        mainCtx.drawImage(particleImage, 0, 0, particleRadius, particleRadius, particle.x - sz, particle.y - sz, 2 * sz, 2 * sz);
        if (s.particles.mirrorX)
            mainCtx.drawImage(particleImage, 0, 0, particleRadius, particleRadius, particle.x - sz, -particle.y - sz, 2 * sz, 2 * sz);
        if (s.particles.mirrorY)
            mainCtx.drawImage(particleImage, 0, 0, particleRadius, particleRadius, -particle.x - sz, particle.y - sz, 2 * sz, 2 * sz);
        if (s.particles.mirrorX && s.particles.mirrorY)
            mainCtx.drawImage(particleImage, 0, 0, particleRadius, particleRadius, -particle.x - sz, -particle.y - sz, 2 * sz, 2 * sz);
        mainCtx.restore();
    }
    function animateParticles() {
        var p, sc;
        for (var i = 0; i < particles.length;) {
            p = particles[i];
            sc = p.dSize * _scale;
            animateParticle(p);
            if (p.x < -960 - sc || p.x > 960 + sc ||
                p.y < -540 - sc || p.y > 540 + sc) {
                particles.splice(i, 1);
            } else i++;
        }
        while (particles.length < s.particles.count)
            createParticle();
    }
    function animateParticle(particle) {
        particle.x += Math.sin(particle.angle) * heat.particleSpeed;
        particle.y += Math.cos(particle.angle) * heat.particleSpeed;
        if (s.particles.is3D)
            particle.z += heat.particleSpeed / 500;
        particle.angle += Math.random() * 0.1 - 0.05;
        particle.dSize = particle.z * particle.size;
    }
    function createParticle() {
        particles.push({
            x: -heat.radius / 2 + Math.random() * heat.radius,
            y: -heat.radius / 2 + Math.random() * heat.radius,
            z: s.particles.is3D ? 0 : 1,
            size: s.particles.minSize + Math.random() * (s.particles.maxSize - s.particles.minSize),
            angle: Math.random() * 2 * Math.PI,
            opacity: s.particles.minOpacity + Math.random() * (s.particles.maxOpacity - s.particles.minOpacity),
            dSize: 0
        });
    }

    function analyzeStep() {
        audio.analyzer.getByteFrequencyData(wavelengthSizes);
        var max = 0, avg = 0;
        var l = s.wavelengths.read;
        for (var i = 0; i < l; i++) {
            max = Math.max(max, wavelengthSizes[i] / 255);
            avg += wavelengthSizes[i] / 255;
        }
        avg /= l;
        var hval = Math.pow(max, 1 / s.heatBonus.maxWaveMult) + Math.pow(avg, 1 / s.heatBonus.avgWaveMult);
        hval *= s.heatBonus.multiplier;
        heat.val += (hval - heat.val) / 4;

        var ang = Math.random() * 2 * Math.PI;
        var mov = heat.val * s.heatBonus.bounce.smoothness;
        heat.x += Math.sin(ang) * mov;
        heat.y += Math.cos(ang) * mov;
        var dist = Math.sqrt(heat.x * heat.x + heat.y * heat.y);
        if (dist > heat.val * s.heatBonus.bounce.radius) {
            heat.x = heat.x / dist * heat.val * s.heatBonus.bounce.radius;
            heat.y = heat.y / dist * heat.val * s.heatBonus.bounce.radius;
        }
        
        heat.radius = s.circle.radius + heat.val * s.heatBonus.circleRadius;
        heat.radius *= radius;
        heat.particleSpeed = s.particles.speed + heat.val * s.heatBonus.particleSpeed;
        heat.whiteness = (~~(heat.val * s.heatBonus.whiteness * 255)).toString(16);
        if (heat.whiteness.length === 1) heat.whiteness = "0" + heat.whiteness;

        var curBars = [];
        if (s.wavelengths.mirrorY) l *= 2;
        var inc = 2 * Math.PI / l;
        l = s.wavelengths.read;
        for (i = 0; i < l; i++)
            curBars.push(wavelengthSizes[l - i - 1] / 255);
        if (s.wavelengths.mirrorY)
            for (; i < 2 * l; i++)
                curBars.push(wavelengthSizes[i - l] / 255);

        bars.unshift(curBars);
        if (bars.length > 15)
            bars.pop();
    }

    win.onload = win.Reload;
    win.Pause = function() {
        if (audio.elem.paused) {
            audio.elem.play();
            $("#pauseControl").html("&#9208;");
        } else {
            audio.elem.pause();
            $("#pauseControl").html("&#9654;");
        }
    };
    win.Mute = function() {
        audio.elem.muted = !audio.elem.muted;
        $("#muteControl").html(audio.elem.muted ? "&#128266;" : "&#128263;");
    };
    win.Skip = function() {
        
    }
}(window.jQuery, window));
