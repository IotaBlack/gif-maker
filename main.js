/**@typedef Options
 * @property {Number} wavelength
 * @property {Number} intensity
 * @property {Number} offset
 */

function options(wavelength = 1, intensity = 0, offset = 0) {
    var obj = {
        wavelength: wavelength,
        intensity: intensity,
        offset: offset,



        getProp: function (prop, x, y, offset) {
            if (this['get' + prop]) {
                return this['get' + prop](x, y, offset)
            }
            return this[prop]
        }
    }
    return obj
}


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
/**@type {ImageData} */
var previewImage = ctx.createImageData(100, 100)
var imageFilters = {
    /**@param {Options} options */
    wave: function (imgd, options, aoffset = 0,scale = 1) {
        var wavelength = options.wavelength
        var intensity = options.intensity
        var img = ctx.createImageData(imgd.width + intensity * 2, imgd.height)

        aoffset += options.offset

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

                wavelength = options.getProp('wavelength', i, j, aoffset)
                intensity = options.getProp('intensity', i, j, aoffset)
                offset = options.getProp('offset', i, j, aoffset)

                var index1 = (j * imgd.width + i) * 4
                var index2 = (j * img.width + i +
                    Math.floor(Math.sin((j/scale / wavelength + offset) / Math.PI * 2) * intensity + options.intensity)) * 4

                img.data[index2 + 0] = imgd.data[index1 + 0]
                img.data[index2 + 1] = imgd.data[index1 + 1]
                img.data[index2 + 2] = imgd.data[index1 + 2]
                img.data[index2 + 3] = imgd.data[index1 + 3]


            }
        }

        return img
    }
}
var filters = []

function initialize() {

    var opts = options(10, 10, 0)
    opts.getoffset = function (x, y, offset) {
        return offset
    }
    /**opts.getintensity = function (x, y, offset) {
        return (Math.cos((offset / 5) / Math.PI) + 1) / 2 * this.intensity
    }**/
    filters.push(new filter(imageFilters.wave, opts))


    load(document.getElementById('preview'))


    animatePreview()
    window.addEventListener("dragover", function (e) { e.preventDefault(); }, true);
    window.addEventListener("drop", function (e) {
        e.preventDefault();
        log("load")
        log(e)
        loadfile(e.dataTransfer.files[0]);
    }, true);


    gifbutton.addEventListener('click',
        e => {
            createGif({
                wavelength: parseFloat(wavelength.value),
                intensity: parseFloat(intensity.value)
            },
                parseFloat(speed.value), delay)
        })

}
function filter(method, options) {
    this.method = method
    this.options = options
}

filter.prototype.apply = function (img, offset, scale = 2) {
    return this.method(img, this.options, offset,scale)
}

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
            var image = new Image();
            image.src = e.target.result;
            image.onload = () => { load(image) }

            //load(e.target.result);
        };
        reader.readAsDataURL(src);
    }
}

function load(src) {
    cvs.width = src.width
    cvs.height = src.height
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(src, 0, 0, src.width, src.height);


    var scale = Math.sqrt(50000 / (src.width * src.height))
    var previewWidth = Math.floor(src.width * scale)
    var previewHeight = Math.floor(src.height * scale)

    console.log(previewHeight, previewWidth, previewHeight * previewWidth)


    displaycvs.width = previewWidth
    displaycvs.height = previewHeight
    displayctx.clearRect(0, 0, displaycvs.width, displaycvs.height);
    displayctx.drawImage(src, 0, 0, previewHeight, previewWidth);

    previewImage = displayctx.getImageData(0, 0, displaycvs.width, displaycvs.height)
    previewImage.scale = scale
    setBackground(
        background >> 16 & 0xff,
        background >> 8 & 0xff,
        background >> 0 & 0xff)
    drawPreview({ wavelength: 0, intensity: 0 }, 0)
}

function applyFilters(img, offset, scale = 1) {

    for (let i = 0; i < filters.length; i++) {
        img = filters[i].apply(img, offset, scale)
    }

    return img
}

/**@param {Options} options */
function drawPreview(options, offset = 0) {

    var img = applyFilters(previewImage, offset,previewImage.scale)
    displaycvs.width = img.width
    displaycvs.height = img.height

    displayctx.putImageData(img, 0, 0)
}



function animatePreview(timer) {
    drawPreview({
        wavelength: parseFloat(wavelength.value),
        intensity: parseFloat(intensity.value)
    },
        (timer / delay * parseFloat(speed.value)) % 100)


    if (preview) {
        requestAnimationFrame(animatePreview)
    }
}

/**@param {Options} options */
function createGif(options, speed, delay) {
    var step = speed
    var img = applyFilters(ctx.getImageData(0, 0, cvs.width, cvs.height), 0)
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
        progressElement.innerHTML = `Progress: ${(p * 100).toFixed(1)}%`
        if (gifframes[currentframe]) {
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
    for (let i = 0; i < 100; i += step) {
        img = applyFilters(ctx.getImageData(0, 0, cvs.width, cvs.height), i)
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


initialize()