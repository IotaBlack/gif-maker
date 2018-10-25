
/**
 * @type {HTMLCanvasElement}
 * */
var displaycvs = document.getElementById('cvs')
var displayctx = displaycvs.getContext('2d')
var cvs = document.createElement('canvas')
var ctx = cvs.getContext('2d')

var log = console.log

var wavelength = document.getElementById('wavelength')
var intensity = document.getElementById('intensity')
var speed = document.getElementById('speed')
var gifbutton = document.getElementById('gifbtn')
var progressElement = document.getElementById('progress')

var background = 0x00ff00

var delay = 42
var gifframes = []
var currentframe = 0
var preview = true

animatePreview()
window.addEventListener("dragover", function (e) { e.preventDefault(); }, true);
window.addEventListener("drop", function (e) {
    e.preventDefault();
    log("load")
    log(e)
    loadfile(e.dataTransfer.files[0]);
}, true);


gifbutton.addEventListener('click', e => { createGif(parseFloat(wavelength.value), parseFloat(intensity.value), parseFloat(speed.value), delay) })


function loadfile(src) {
    if (src === undefined) { } else {
        //	Prevent any non-image file type from being read.
        if (!src.type.match(/image.*/)) {
            log("The dropped file is not an image: ", src.type);
            return;
        }

        //	Create our FileReader and run the results through the render function.
        var reader = new FileReader();
        reader.onload = function (e) {
            load(e.target.result);
        };
        reader.readAsDataURL(src);
    }
}

function load(src) {
    var image = new Image();
    image.onload = function () {
        var canvas = ctx.canvas

        cvs.width = displaycvs.width = image.width
        cvs.height = displaycvs.height = image.height
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, image.width, image.height);
        setBackground(background >> 16 & 0xff, background >> 8 & 0xff, background >> 0 & 0xff)
        draw(13, 13, 0)
    };
    image.src = src;
}

function draw(wavelength, intensity, offset) {

    var img = wave(ctx.getImageData(0, 0, cvs.width, cvs.height), wavelength, intensity, offset)

    displaycvs.width = img.width
    displaycvs.height = img.height
    displayctx.putImageData(img, 0, 0)
}

function wave(imgd, wavelength, intensity, offset) {
    var img = ctx.createImageData(imgd.width + intensity * 2, imgd.height)


    for (let i = 0; i < img.width; i++) {
        for (let j = 0; j < img.height; j++) {
            var index1 = (j * img.width + i) * 4
            img.data[index1 + 0] = background >> 16 & 0xff
            img.data[index1 + 1] = background >> 8 & 0xff
            img.data[index1 + 2] = background >> 0 & 0xff
            img.data[index1 + 3] = 255
        }
    }

    for (let i = 0; i < imgd.width; i++) {
        for (let j = 0; j < imgd.height; j++) {
            var index1 = (j * imgd.width + i) * 4
            var index2 = (j * img.width + i + Math.floor(Math.sin((j / wavelength + offset) / Math.PI * 2) * intensity + intensity)) * 4

            img.data[index2 + 0] = imgd.data[index1 + 0]
            img.data[index2 + 1] = imgd.data[index1 + 1]
            img.data[index2 + 2] = imgd.data[index1 + 2]
            img.data[index2 + 3] = imgd.data[index1 + 3]


        }
    }

    return img
}

function animatePreview(timer) {
    draw(parseFloat(wavelength.value), parseFloat(intensity.value), timer / delay * parseFloat(speed.value))
    if (preview) {
        requestAnimationFrame(animatePreview)
    }
}


function createGif(wavelength, intensity, speed, delay) {
    var step = speed
    var img = wave(ctx.getImageData(0, 0, cvs.width, cvs.height), wavelength, intensity, 0)
    displaycvs.width = img.width
    displaycvs.height = img.height

    var gif = new GIF({
        workers: 2,
        quality: 1,
        delay: delay,
        width: displaycvs.width,
        height: displaycvs.height,
        transparent: background

    });
    gif.on('progress', p => {
        console.log('progress: ' + p)
        progressElement.innerHTML = `Progress: ${(p*100).toFixed(1)}%`
        if(gifframes[currentframe]){
            displayctx.putImageData(gifframes[currentframe++], 0, 0)
        }
    })

    gif.on('finished', function (blob) {

        var link = document.createElement('a')
        link.download = 'wave.gif'
        link.href = URL.createObjectURL(blob)

        link.click()
    });
    gifframes = []
    preview = false
    currentframe = 0
    for (let i = 0; i < 10; i += step) {
        img = wave(ctx.getImageData(0, 0, cvs.width, cvs.height), wavelength, intensity, i)
        //displayctx.putImageData(img, 0, 0)
        gifframes.push(img)
        gif.addFrame(img, { delay: delay, copy: true })
    }
    //gif.frames[gif.frames.length-1].delay = 0
    gif.frames.pop()
    gif.render();
    return gif
}


function setBackground(r, g, b) {
    var data = ctx.getImageData(0, 0, cvs.width, cvs.height)

    for (let i = 0; i < data.data.length; i += 4) {
        if (data.data[i + 3] == 0) {
            data.data[i + 0] = r
            data.data[i + 1] = g
            data.data[i + 2] = b
            data.data[i + 3] = 255
        }

    }

    ctx.putImageData(data, 0, 0)
}