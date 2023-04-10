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

// Some data is returned as decimal, not fraction, which is what is commonly seen
function getFraction(fraction) {
    var gcd = function(a, b) {
        if (b < 0.0000001) return a;                // Since there is a limited precision we need to limit the value.
        return gcd(b, Math.floor(a % b));           // Discard any fractions due to limitations in precision.
    };

    //var fraction = 0.005;
    var len = fraction.toString().length - 2;

    var denominator = Math.pow(10, len);
    var numerator = fraction * denominator;

    var divisor = gcd(numerator, denominator);    // Should be 5

    numerator /= divisor;                         // Should be 687
    denominator /= divisor;                       // Should be 2000

    console.log(Math.floor(numerator) + '/' + Math.floor(denominator));
    return (Math.floor(numerator) + '/' + Math.floor(denominator));
}

// Primary page updater. When called, it looks at the URL and determines
// one of three page states: Home (album list), album contents, or
// image details
function updatePage() {
    correctARN(); // gotta do this first
    var components = window.location.pathname.split('/');
    var menu = '<li><a href="/">Album List</a></li>'; // will always be present
    var callback = 'listAlbums';
    var args = '';

    // URL has no more than three parts: home, album, and image
    // If the second or third components (which includes the second) are present,
    // then write in the second component (the album contents)
    if ((components[1] && components[1] !== '' ) || 
        (components[2] && components[2] !== '' )) {
        menu += '<li><a href="/' + components[1] + '/">' + components[1].replace(/\+/g, ' ') + '</a></li>';
        callback = 'viewAlbum';
        args = components[1];
    }

    // If the third component is present (we assume the statement above has already
    // done its job), add the third component (the image)
    if (components[2] && components[2] !== '') {
        menu += '<li><a href="/' + components[1] + '/' + components[2] + '">' + components[2] + '</a></li>';
        callback = 'showImage';
        args = components[1] + '/' + components[2];
    }

    var nav = document.querySelectorAll("nav ul"); // get the nav element and its list
    if (nav !== undefined && nav[0]) { // make sure it's actually there
        nav[0].innerHTML = menu; // update the nav
    }

    window[callback](args); // call the appropriate update function
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
                var albumPath = decodeURIComponent(albumName.replace(' ', '+'));
                return getHtml([
                '<li>',
                    '<a href="/' + albumPath + '/">',
                        '<img src="//' + s3Endpoint + '/thumb_' + albumName + '.jpg" height="100" width="100" />',
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
        document.getElementById('albums').setAttribute("loaded","loaded");
    });
}

// Show the photos that exist in an album.
function viewAlbum(albumName) {
    albumName = albumName.replace(/\+/g, ' ');
    var albumPhotosKey = albumName + '/';
    console.log(albumName);
    console.log(albumPhotosKey);
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
            components[0] = components[0].replace(' ','+');
            var photoThumbUrl = bucketUrl + components[0] + '/thumb_' + components[1];
            return getHtml([
                '<li>',
                    '<a href="/' + photo.Key + '">',
                        '<img src="' + photoThumbUrl + '" width="100" height="100" />',
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
    });
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

    });
}

function showMeta(image) {
    var meta = document.getElementById('meta');
    EXIF.enableXmp();
    EXIF.getData(image, function() {
        var tagsAvailable = EXIF.getAllTags(this);
        for (let i in tagsAvailable) {
            var elem = document.getElementById(i);
            var tagdata = tagsAvailable[i];
            switch(i) {
                case 'ExposureTime':
                    console.log(tagdata);
                    tagdata = getFraction(tagdata) + 's';
                    break;
                case 'FNumber':
                    tagdata = 'f/' + tagdata;
                    break;
                case 'FocalLength':
                    tagdata = tagdata + 'mm';
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
            document.getElementById('map6').src = mapURL + "&zoom=6";
            document.getElementById('map10').src = mapURL + "&zoom=10";
            document.getElementById('map16').src = mapURL + "&zoom=16";

        }
    });
}

window.onload = updatePage;