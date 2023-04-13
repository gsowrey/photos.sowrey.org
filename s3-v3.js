var pdebug = true;

// Helper method for converting XML to JSON
// As seen at https://stackoverflow.com/a/20861541
function xml2json(xml) {
    try {
      var obj = {};
      if (xml.children.length > 0) {
        for (var i = 0; i < xml.children.length; i++) {
          var item = xml.children.item(i);
          var nodeName = item.nodeName;
  
          if (typeof (obj[nodeName]) == "undefined") {
            obj[nodeName] = xml2json(item);
          } else {
            if (typeof (obj[nodeName].push) == "undefined") {
              var old = obj[nodeName];
  
              obj[nodeName] = [];
              obj[nodeName].push(old);
            }
            obj[nodeName].push(xml2json(item));
          }
        }
      } else {
        obj = xml.textContent;
      }
      return obj;
    } catch (e) {
        console.log(e.message);
    }
  }

function getData() {
    var data = localStorage.getItem('psodata');
    if (data !== null) { // and check that data isn't more than 2 hours old
        updatePage(JSON.parse(data));
    }
    else {
        getS3Contents();
    }
}

async function getS3Contents() {
    var path = 'https://photos.sowrey.org.s3.ca-central-1.amazonaws.com/';

    await fetch(path, {
        method: "GET",
        mode: "cors",
        credentials: "same-origin",
        referrerPolicy: "no-referrer",
    })
    .then(response => response.text())
    .then(data => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, "application/xml");
        var data = xml2json(xml);
        //console.log(data);
        getPhotoData(data);
    })
    .catch(console.error);
}

function addAlbum(data,item) {
    if (data && item) {
        var comp = item.Key.split('/');
        if (!comp[0].includes('thumb')) data.albums.push(comp[0]);
    }
    else {
        console.log('addAlbum: Data is empty');
    }
    return data;
}
function addPhoto(data,item) {
    if (data && item && item.Key !== undefined) {
        let photo = {
            p: item.Key,
            d: Date.parse(item.LastModified)
        }
        data.photos.push(photo);
    }
    else {
        console.log('addPhoto: Data is empty');
    }
    return data;
}
function dataHasAlbum(data,item) {
    var album = item.Key.split('/');
    return (data.albums.includes(album[0]));
}

// Gets the JSON'd XML data from S3 and breaks out the albums, pictures,
// and anything else needed to display the lists
function getPhotoData(data) {
    let pd = {albums:[],photos:[]};
    if (data && data !== null && data !== undefined &&
        data.ListBucketResult.Contents !== undefined) {
        var lbr = data.ListBucketResult.Contents;
        for (i in lbr) {
            if (!dataHasAlbum(pd,lbr[i])) addAlbum(pd,lbr[i]);
            addPhoto(pd,lbr[i]);
        }
    }
    else {
        document.querySelector('nav').innerHTML = "Failed to load picture data.";
    }
    pd.updated = Date.now();
    localStorage.setItem('psodata', JSON.stringify(pd));
    //updatePage(pd);
}

// Primary page updater. When called, it looks at the URL and determines
// one of three page states: Home (album list), album contents, or
// image details
function updatePage(data) {
    var components = window.location.pathname.split('/');
    var menu = '<li><a href="/">All Albums</a></li>'; // will always be present
    var callback = 'listAlbums';
    var args = data;

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

    //grover(); // Near! (pant pant pant) Far!

    window[callback](args); // call the appropriate update function
}

// A utility function to create HTML.
function getHtml(template) {
    /*var html;
    for (var i=0; i<template.length;i++) {
        html += template[i] + "\n";
    }
    return html;*/
    return template.join('\n');
}

// List the photo albums that exist in the bucket.
function listAlbums(data) {
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
                var albumName = prefix.replace('/', '');
                var components = albumName.split(' ');
                var thumbPath = 'thumb_' + albumName.replace(/\s/g,'_');
                var albumPath = components.join('+');
                return getHtml([
                '<li>',
                    '<a href="/' + albumPath + '/">',
                        '<img src="//' + s3Endpoint + '/' + thumbPath + '.jpg" height="250" width="250" />',
                        '<br />' + albumName,
                    '</a>',
                '</li>'
                ]);
            });
            var message = albums.length>0 ?
                '' :
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

window.onload = getData;