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

// List the photo albums that exist in the bucket.
function listAlbums() {
    s3.listObjects({Delimiter: '/'}, function(err, data) {
        var albumList = [];
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
                albumList.push(albumName);
                return getHtml([
                '<li>',
                    '<a href="#" onclick="viewAlbum(\'' + albumName + '\');return false">',
                    '<p>' + albumName + '</p>',
                    '<img src="//' + s3Endpoint + '/thumb_' + albumName + '.jpg" height="100" width="100" />',
                    '</a>',
                '</li>'
                ]);
            });
            var message = albums.length ?
                getHtml([
                '<p>Click on an album name to view it.</p>',
                ]) :
                '<p>You do not have any albums. Please Create album.';
            var htmlTemplate = [
                '<h2>Albums</h2>',
                message,
                '<ul>',
                getHtml(albums),
                '</ul>',
            ]
        }
        document.getElementById('viewer').innerHTML = getHtml(htmlTemplate);
    });
}

// Show the photos that exist in an album.
function viewAlbum(albumName) {
    var albumPhotosKey = encodeURIComponent(albumName) + '/';
    s3.listObjects({Prefix: albumPhotosKey}, function(err, data) {
        if (err) {
            return alert('There was an error viewing your album: ' + err.message);
        }
        // 'this' references the AWS.Request instance that represents the response
        var href = this.request.httpRequest.endpoint.href;
        var bucketUrl = href + albumBucketName + '/';

        var photos = data.Contents.map(function(photo) {
        var photoKey = photo.Key;
        var photoUrl = bucketUrl + encodeURIComponent(photoKey);
        return getHtml([
            '<span>',
            '<div>',
                '<br/>',
                '<a href="#" onclick="showImage(\'' + photo.Key + '\');return false">',
                '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
                '</a>',
            '</div>',
            '<div>',
                '<span>',
                photoKey.replace(albumPhotosKey, ''),
                '</span>',
            '</div>',
            '</span>',
        ]);
        });
        var message = photos.length ?
        '<p>The following photos are present.</p>' :
        '<p>There are no photos in this album.</p>';
        var htmlTemplate = [
        '<div>',
            '<button onclick="listAlbums()">',
            'Back To Albums',
            '</button>',
        '</div>',
        '<h2>',
            'Album: ' + albumName,
        '</h2>',
        message,
        '<div>',
            getHtml(photos),
        '</div>',
        '<h2>',
            'End of Album: ' + albumName,
        '</h2>',
        '<div>',
            '<button onclick="listAlbums()">',
            'Back To Albums',
            '</button>',
        '</div>',
        ]
        document.getElementById('viewer').innerHTML = getHtml(htmlTemplate);
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

    document.getElementById('viewer').innerHTML = '';
}

function showMeta(image) {
    var meta = document.getElementById('meta');
    EXIF.enableXmp();
    EXIF.getData(image, function() {
        var alldata = EXIF.getAllTags(this);
        console.log(alldata);
        let tagsAvailable = {
            ...EXIF.Tags,
            ...EXIF.TiffTags,
            ...EXIF.GPSTags,
            ...EXIF.IFD1Tags
        }
        console.log(EXIF.getTag(this, "ShutterSpeedValue"));
        for (let i in tagsAvailable) {
            var item = document.createElement('li');
            var tagdata = EXIF.getTag(this, tagsAvailable[i]);
            if (tagdata !== undefined) {
                item.innerHTML = `${tagsAvailable[i]} : ${tagdata}`
                meta.appendChild(item);
            }
        }
    });
}

function main() {
    correctARN(); // gotta do this first
    listAlbums();
}
window.onload = main;