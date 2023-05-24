const ExifReader = require('exifreader');
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
            //var imgPath = path.join(__dirname, dirPath, "/", file);
            var imgPath = path.join(dirPath, "/", file);
            imgPath = imgPath.substring(imgPath.indexOf('assets/photos/')+14);
            if (!imgPath.includes('thumb') && !imgPath.includes('DS_Store')) {
                arrayOfFiles.push(imgPath);
            }
        }
    });
    
    return arrayOfFiles
}

async function cleanData() {
    const fs = require("fs");
    const path = require("path");
    const directory = "./data";

    if (fs.existsSync(directory)) {
        fs.readdir(directory, (err, files) => {
            if (err) throw err;

            for (const file of files) {
                fs.unlink(path.join(directory, file), (err) => {
                if (err) throw err;
                });
            }
        });
    }
}

function writeData(filename,data) {
    var output = JSON.stringify(data);
    var write_dir = './data';
    var writepath = write_dir + '/' + filename + '.json';

    if (!fs.existsSync(write_dir)) {
        fs.mkdirSync(write_dir);
    }
    console.log('Writing picture data for ' + filename); 
    fs.writeFile(writepath,output, err => {
        if (err) {
            console.error(err);
        }
        else {
            //console.log('Written.');
        }
    });
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
        'Country',
        'Keywords'
    ];
    var tags = {
        'Filename'          : image,
        'images'            : ['/photos/' + image]
    }

    for (i in myTags) {
        const missing = 'Unavailable';
        if (tagsAvailable[myTags[i]] === undefined) {
            if (myTags[i].includes("Date")) {
                console.log('\n\nERROR! Missing date: ' + image + '\n\n');
                process.exitCode = 1;
                process.exit();
            }
            tagsAvailable[myTags[i]] = { 'description' : missing };
        } 

        var tagData = tagsAvailable[myTags[i]].description;

        // Yeah, need to put it out here so that it actually fires; the switch doesn't always work
        if (myTags[i] == 'LensProfileName') {
            var override = '';
            if (tagData == missing && tagsAvailable['Lens'] !== undefined && 
                tagsAvailable['Lens'] !== '') {
                    override = tagsAvailable['Lens'].description;
            } 
            else if (tagsAvailable['Lens'].description.length > tagData.length) {
                
                override = tagsAvailable['Lens'].description
            }
            if (override !== '') {
                myTags[i].description = override;
                tagData = override;
            }
        }

        //if (image.includes('6007')) console.log(tagData);

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
                    if (tagData.includes(removeText)) tagData = tagData.substring(removeText.length,tagData.length-1);
                    if (tagData.includes('17.0-85.0 mm')) tagData = "Canon EF-S 17-85mm f/4-5.6 IS USM";
                    break;
                case 'Model': 
                    if (tagData.includes('ILCE-7M3')) tagData = "Sony Alpha 7 III";
                    break;  
                case 'Keywords': 
                    var keywords = [];
                    for (t in tagsAvailable['Keywords']) {
                        var tmp = tagsAvailable['Keywords'][t].description;
                        if (tmp !== undefined) keywords.push(tmp.toLowerCase());
                    }
                    if (keywords !== undefined && keywords.length !== 0) {
                        tags['tags'] = keywords;
                    }
                    break;   
            }
        }
        tags[myTags[i]] = tagData;
    }
 
    return tags;
}

async function buildAlbums(files) {
    await cleanData(); // make sure there are no lingering old files, first
    let countries = [];

    for (i in files) {
        // Build picture data
        let exif = await getEXIF(files[i]);

        // Build country data
        let country = countries.filter(country => {
            return country.title === exif.Country 
        });
        if ( country === undefined || country.length === 0) {
            country = {
                'title' : exif.Country,
                'regions' : []
            }
            countries.push(country); 
        }

        for (j in countries) {
            if (countries[j].title === exif.Country) {
                let region = countries[j].regions.filter(region => {
                    return region.title == exif.State
                });
                if (region === undefined || region.length === 0) {
                    region = {
                        'title' : exif.State,
                        'cities' : []
                    }
                    countries[j].regions.push(region);
                }

                for (k in countries[j].regions) {
                    if (countries[j].regions[k].title === exif.State) {
                        let city = countries[j].regions[k].cities.filter(city => {
                            return city.title == exif.City
                        });
                        if (city === undefined || city.length === 0) {
                            city = {
                                'title' : exif.City,
                                'pictures' : []
                            }
                            countries[j].regions[k].cities.push(city);
                        }

                        for (l in countries[j].regions[k].cities) {
                            if (countries[j].regions[k].cities[l].title === exif.City) {
                                let picture = countries[j].regions[k].cities[l].pictures.filter(picture => {
                                    return picture.UnixTime == exif.UnixTime
                                });
                                if (picture === undefined || picture.length === 0) {
                                    picture = {
                                        'title' : exif.title,
                                        'UnixTime' : exif.UnixTime,
                                        'DateTimeOriginal' : exif.DateTimeOriginal,
                                        'filename' : exif.Filename
                                    }
                                    countries[j].regions[k].cities[l].pictures.push(picture);
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
                break;
            }
        }

        exif['cityClean'] = exif.City.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
        exif['regionClean'] = exif.State.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
        exif['countryClean'] = exif.Country.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();

        let picture = {
            'picture' : [{
                'path' : 'photos/' + exif.UnixTime,
                'fields' : exif
            }]
        }
        picture.picture[0].fields['type'] = "article";
        writeData(exif.UnixTime,picture);
    }

    for (i in countries) {
        let country = countries[i];
        var cttitle = country.title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
        cttitle = cttitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        for (j in country.regions) {
            let region = countries[i].regions[j]; 
            var rgtitle = region.title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
            rgtitle = rgtitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();

            for (k in region.cities) {
                let city = region.cities[k];
                var cytitle = city.title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
                cytitle = cytitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                var crcpath = cttitle + '_' + rgtitle + '_' + cytitle
                let page = {
                    'picture' : [{
                        'path' : cttitle + '/' + rgtitle + '/' + cytitle,
                        'fields' : {
                            'title' : region.cities[k].title + ', ' + region.title + ', ' + country.title,
                            'DateTimeOriginal' : '2005-05-01',
                            'type' : 'geolist',
                            'regionClean' : rgtitle,
                            'countryClean' : cttitle,
                            'countryTitle' : countries[i].title,
                            'regionTitle' : countries[i].regions[j].title,
                            'pictures' : city.pictures
                        },
                    }]
                }
                writeData(crcpath,page);
            }
        }
    }
}

var files = getAllFiles('./assets/photos');
buildAlbums(files);

