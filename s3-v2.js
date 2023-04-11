// Due to some stupid misinformation, the S3 bucket URI format is different
// than what I actually need. So there's some weirdness in here...

// This borrows heavily from https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascript/example_code/s3/s3_PhotoViewer.js

"use strict";

// Set some configuration information 
var albumBucketName = 'photos.sowrey.org';
var s3Endpoint = 'photos.sowrey.org.s3.ca-central-1.amazonaws.com';
AWS.config.region = 'us-east-2'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-2:0806a01f-c913-4f3c-babb-f9cb6af8cdcf',
});

// Create a new service object
var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {Bucket: albumBucketName}
});

// A utility function to create HTML.
function getHtml(template) {
    return template.join('\n');
}

// For some reason, AWS requires <bucket>.s3.<region>.amazonaws.com, but
// that's not what the API needs. Maybe I screwed something up in the config
// but this is the only way it'll work. Soooo gotta override a few things.
function correctARN() {
    s3.endpoint.host = s3.endpoint.hostname = s3.config.endpoint = s3Endpoint;
    s3.config.s3BucketEndpoint = true;
}

// Because it's normal see times in fractions, not decimals
function toFraction(x, tolerance) {
    if (x == 0) return 0;
    if (x < 0) x = -x;
    if (!tolerance) tolerance = 0.0001;
    var num = 1, den = 1;

    function iterate() {
        var R = num/den;
        if (Math.abs((R-x)/x) < tolerance) return;

        if (R < x) num++;
        else den++;
        iterate();
    }

    iterate();
    return (num + '/' + den);
}

// Primary page updater. When called, it looks at the URL and determines
// one of three page states: Home (album list), album contents, or
// image details
function updatePage() {
    correctARN(); // gotta do this first
    var components = window.location.pathname.split('/');
    var menu = '<li><a href="/">All Albums</a></li>'; // will always be present
    var callback = 'listAlbums';
    var args = '';

    // URL has no more than three parts: home, album, and image
    // If the second or third components (which includes the second) are present,
    // then write in the second component (the album contents)
    if ((components[1] && components[1] !== '' ) || 
        (components[2] && components[2] !== '' )) {
        var albumPath = decodeURI(components[1]).replace(' ','+');
        menu += '<li><a href="/' + albumPath + '/">' + components[1].replace(/\+/g, ' ') + '</a></li>';
        callback = 'viewAlbum';
        args = components[1];
    }

    // If the third component is present (we assume the statement above has already
    // done its job), add the third component (the image)
    if (components[2] && components[2] !== '') {
        var albumPath = decodeURI(components[1]).replace(' ','+');
        menu += '<li><a href="/' + albumPath + '/' + components[2] + '">' + components[2] + '</a></li>';
        callback = 'showImage';
        args = components[1] + '/' + components[2];
    }

    var nav = document.querySelectorAll("nav ul"); // get the nav element and its list
    if (nav !== undefined && nav[0]) { // make sure it's actually there
        nav[0].innerHTML = menu; // update the nav
    }

    grover(); // Near! (pant pant pant) Far!

    window[callback](args); // call the appropriate update function
}

function grover() {
    document.querySelector('#grover').addEventListener(
        "mouseover",
        (event) => {
            var showMap = '';
            switch (event.target.textContent) {
                case "Near":
                    showMap = "map16";
                    break;
                case "(Pant,pant)":
                    showMap = "map10";
                    break;
                case "Far!":
                    showMap = "map6";
                    break;
            }
            if (showMap !== '') {
                var nearfar = document.getElementById('photogeo').getElementsByTagName('img');
                for (var i=0; i<nearfar.length; i++ ) {nearfar[i].style.display = 'none';}
                document.getElementById(showMap).style.display = 'block';
            }
    });
}

// List the photo albums that exist in the bucket.
function listAlbums() {
    s3.listObjects({Delimiter: '/'}, function(err, data) {
        if (err) {
            var htmlTemplate = getHtml([
                '<p>',
                    'There was an error listing your albums: ' + err.message,
                '</p>'
            ]);
        } else {
            var albums = data.CommonPrefixes.map(function(commonPrefix) {
                var prefix = commonPrefix.Prefix;
                var albumName = decodeURIComponent(prefix.replace('/', ''));
                var thumbPath = 'thumb_' + albumName.replace(/\s/g,'_');
                var albumPath = decodeURIComponent(albumName.replace(' ', '+'));
                return getHtml([
                '<li>',
                    '<a href="/' + albumPath + '/">',
                        '<img src="//' + s3Endpoint + '/' + thumbPath + '.jpg" height="250" width="250" />',
                        '<br />' + albumName,
                    '</a>',
                '</li>'
                ]);
            });
            var message = albums.length ?
                getHtml([]) :
                '<p>Hmm. No albums found. That\'s ... odd.</p>';
            var htmlTemplate = [
                message,
                '<ul>',
                getHtml(albums),
                '</ul>',
            ]
        }

        document.getElementById('albumlist').innerHTML = getHtml(htmlTemplate);
        document.getElementById('albums').style.display = "block";
    });
}

// Show the photos that exist in an album.
function viewAlbum(albumName) {
    albumName = albumName.replace(/\+/g, ' ');
    var albumPhotosKey = albumName + '/';
    s3.listObjects({Prefix: albumPhotosKey}, function(err, data) {
        if (err) {
            return alert('There was an error viewing your album: ' + err.message);
        }
        // 'this' references the AWS.Request instance that represents the response
        var bucketUrl = '//' + s3.endpoint.host + '/';
        var albumLabel = document.querySelector("#contents h2 span");
        if (albumLabel !== undefined) {
            albumLabel.innerHTML = albumName;
        }

        var photos = data.Contents.map(function(photo) {
            var components = photo.Key.split('/');
            var imagePath = photo.Key.replace(' ', '+');
            components[0] = components[0].replace(' ','+');
            var photoThumbUrl = bucketUrl + components[0] + '/' + components[1];
            return getHtml([
                '<li>',
                    '<a href="/' + imagePath + '">',
                        '<img src="' + photoThumbUrl + '" height="350" />',
                    '</a>',
                '</li>'
            ]);
        });
        var message = photos.length ? '' : '<p>There are no photos in this album.</p>';
        var htmlTemplate = [
            message,
            '<ul>',
                getHtml(photos),
            '</ul>'
        ]
        document.getElementById('pictures').innerHTML = getHtml(htmlTemplate);
        document.getElementById('contents').style.display = "block";
    });
    console.log(imageList);
}

function showImage(image) {
    var hero = document.getElementById('hero');
    var path = '//' + s3.config.endpoint + '/' + image;
    var origin = window.location.origin;

    fetch(path, {
        method: 'get', // Default is 'get'
        mode: 'cors',
        headers: new Headers({
            'Origin': origin
        })
    })
    .then(function(response) {
        hero.src = response.url;
        showMeta(hero);
    })
    .catch(function(error) {
        hero.style.display = 'none';
        var details = document.querySelector('#details > div');
        details.style.height = 'auto';
        details.style.backgroundColor = '#fff';
        document.querySelector('#details div p').textContent = error;
        //document.querySelector('#details div:last-child').style.display = 'none';
    });

    document.getElementById('details').style.display = "block";
}

function showMeta(image) {
    EXIF.enableXmp();
    EXIF.getData(image, function() {
        var tagsAvailable = EXIF.getAllTags(this);
        var hasTitle, hasCaption = false;
        for (let i in tagsAvailable) {
            var elem = document.getElementById(i);
            var tagdata = tagsAvailable[i];
            //console.log(tagsAvailable);
            switch(i) {
                case 'DateTimeOriginal':
                    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    var tdinfo = tagdata.split(' ');
                    var dateinfo = tdinfo[0].split(':');
                    tagdata = '' + (parseInt(dateinfo[2])) + ' ' + months[parseInt(dateinfo[1])-1] + ' ' + dateinfo[0];
                    break;
                case 'ExposureTime':
                    var exposure = Math.trunc(tagdata);
                    if (exposure == 0) exposure = '';
                    var remain = tagdata - exposure;
                    tagdata = '' + exposure + ' ' + toFraction(remain) + 's';
                    break;
                case 'FNumber':
                    tagdata = 'f/' + tagdata;
                    break;
                case 'FocalLength':
                    tagdata = tagdata + 'mm';
                    break;
                case 'ExposureBias':
                    var exposure = Math.trunc(tagdata);
                    if (exposure != 0) {
                        var remain = tagdata - exposure;
                        tagdata = '' + exposure + ' ' + ((remain == 0)?'':toFraction(remain));
                    } 
                    else {
                        tagdata = exposure;
                    }
                    break;
                }

            if (elem !== null) {
                elem.innerHTML = tagdata;
            }
        }

        if (tagsAvailable['GPSLatitude'] && tagsAvailable['GPSLongitude']) {
            var nsMod = (tagsAvailable['GPSLatitudeRef']==="N")?'':'-';
            var ewMod = (tagsAvailable['GPSLongitudeRef']==="E")?'':'-';
            var coords = ewMod + (tagsAvailable['GPSLongitude'][0] + (tagsAvailable['GPSLongitude'][1]/60));
            coords += ',' + nsMod + (tagsAvailable['GPSLatitude'][0] + (tagsAvailable['GPSLatitude'][1]/60));
            var mapURL = 'https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=300&height=200&center=lonlat:' + coords + '&marker=lonlat:' + coords + ';color:%23ff0000;size:medium&apiKey=567f0d30482f4ad8b8674c54af6613f5';
            document.getElementById('map6').src = mapURL + "&zoom=4";
            document.getElementById('map10').src = mapURL + "&zoom=10";
            document.getElementById('map16').src = mapURL + "&zoom=16";

        }

        if (!hasTitle) document.querySelector('#details h2').innerHTML = "Untitled";
        if (!hasCaption) document.querySelector('#details p').style.display = "none";
    });
}

window.onload = updatePage;