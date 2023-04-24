const ExifReader = require('exifreader');
const yaml = require('js-yaml');
const fs = require("fs");
const path = require("path");

const getAllFiles = function(dirPath, arrayOfFiles) {
    files = fs.readdirSync(dirPath)
  
    arrayOfFiles = arrayOfFiles || []
  
    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
        } 
        else {
            var imgPath = path.join(__dirname, dirPath, "/", file);
            imgPath = imgPath.substring(imgPath.indexOf('assets/photos/')+14);
            if (!imgPath.includes('thumb') && !imgPath.includes('DS_Store')) {
                arrayOfFiles.push(imgPath);
            }
        }
    });
  
    return arrayOfFiles
}

async function getEXIF(image) {
    var tags;
    try {
        tags = await ExifReader.load('./assets/photos/' + image);
        delete tags['MakerNote'];
    } catch (error) {
        // Handle error.
        console.log('Unable to read EXIF');
        console.log(error);
    }
    return showMeta(tags,image);
}

function showMeta(tagsAvailable,image) {
    const myTags = [
        'DateTimeOriginal',
        'GPSLatitude',
        'GPSLongitude',
        'Temperature',
        'description',
        'title',
        'ExposureBiasValue',
        'Model',
        'Lens',
        'LensProfileName',
        'ISOSpeedRatings',
        'FocalLength',
        'FNumber',
        'ExposureTime',
        'ExposureMode',
        'ExposureProgram',
        'MeteringMode',
        'WhiteBalance',
        'City',
        'State',
        'Country'
    ];
    var tags = {
        'Filename'          : image
    }

    for (i in myTags) {
        const missing = 'Unavailable';
        if (tagsAvailable[myTags[i]] === undefined) tagsAvailable[myTags[i]] = { 'description' : missing };

        var tagData = tagsAvailable[myTags[i]].description;
        if (tagData !== missing) {
            switch(myTags[i]) {
                case 'DateTimeOriginal':
                    var tdinfo = String(tagsAvailable['DateTimeOriginal'].description); 
                    tdinfo = tdinfo.split(' ');
                    var dateinfo = tdinfo[0].replace(/:/g,'-');
                    tags['date'] = dateinfo;
                    dateinfo += 'T' + tdinfo[1];
                    tagData = dateinfo;
                    tags['UnixTime'] = Date.parse(dateinfo);
                    break;
                case 'ExposureBiasValue':
                    tagData = parseFloat(tagData).toFixed(2);
                    break;
                case 'ExposureTime':
                    tagData += ' seconds';
                    break;
                case 'GPSLatitude':
                    var nsMod = (tagsAvailable['GPSLatitudeRef'].value[0]==="N")?'':'-';
                    tagData = nsMod + tagData;
                    break;
                case 'GPSLongitude':
                    var ewMod = (tagsAvailable['GPSLongitudeRef'].value[0]==="E")?'':'-';
                    tagData = ewMod + tagData;
                    break;
                case 'LensProfileName':
                    var removeText = 'Adobe (';
                    tagData = tagData.substring(removeText.length,tagData.length-1);
            }
        }
        tags[myTags[i]] = tagData;
    }
 
    return tags;
}

async function buildAlbums(files) {
    let albums = {};
    const write_dir = './data';
    for (i in files) {
        var components = files[i].split('/');
        if (!albums[components[0]]) {
            var albumName = components[0];
            console.log(albumName);
            let albumPictures = await getAlbumPictures(files,albumName);
            albums[albumName] = albumPictures;
        }
    }
    for (i in albums) {
        let pictures = {
            'pictures' : albums[i]
        }
        var output = yaml.dump(pictures, 
            {
                'sortKeys': true        // sort object keys
            }
        );
        //console.log(output);
        if (!fs.existsSync(write_dir)) {
            fs.mkdirSync(write_dir);
        }
        fs.writeFile(write_dir + '/pictures-' + i.toLowerCase() + '.yaml',output, err => {
            if (err) {
                console.error(err);
            }
            else {
                console.log('Image data written to YAML.');
            }
          });
    }
}

async function getAlbumPictures(files,album) {
    let pictures = [];
    for (i in files) {
        var file = files[i];
        if (file.includes(album)) {
            let exif = await getEXIF(file);
            var title = exif.UnixTime;
            var path = album.toLowerCase();
            path += '/' + title;
            let picture = {
                'path' : path,
                'fields' : exif
            }
            if (pictures.keys(picture).length !== 0) {
                pictures.push(picture);
            }
        }
    }
    return pictures;
}

//getEXIF('./static/photos/Edinburgh/_DSC1127.jpg');
var files = getAllFiles('./assets/photos');
buildAlbums(files);

