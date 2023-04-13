var pdebug = true;

var pdata; // Global variable for photo data
var s3Endpoint = '//photos.sowrey.org.s3.ca-central-1.amazonaws.com/';

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
    const queryString = window.location.search;
    if (data !== null && !queryString.includes('cc')) { // and check that data isn't more than 2 hours old
        pdata = JSON.parse(data);
        updatePage();
    }
    else {
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                const parser = new DOMParser();
                const xml = parser.parseFromString(xhr.responseText, "application/xml");
                var data = xml2json(xml);
                getPhotoData(data);
            }
        }
        xhr.open('GET', s3Endpoint, true);
        xhr.send(null);
    }
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
    pd.albums.sort();
    pd.photos.sort((a,b) => (a.d < b.d) ? 1: ((b.d < a.d) ? -1 : 0));
    pdata = pd;
    localStorage.setItem('psodata', JSON.stringify(pdata));
    updatePage();
}

// Primary page updater. When called, it looks at the URL and determines
// one of three page states: Home (album list), album contents, or
// image details
function updatePage() {
    var components = window.location.pathname.split('/');
    var menu = '<li><a href="/">All Albums</a></li>'; // will always be present
    var callback = 'listAlbums';
    var args;

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

// A utility function to create HTML.
function getHtml(template) {
    if (Array.isArray(template)) return template.join('\n');
    return template;
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
    var albums = pdata.albums;
    var template = '';
    for (i in albums) {
        var albumPath = albums[i].replace(/\s/g,"+");
        var thumbPath = 'thumb_' + albums[i].replace(/\s/g,'_');
        template += getHtml([
            '<li>',
                '<a href="/' + albumPath + '/">',
                    '<img src="' + s3Endpoint + thumbPath + '.jpg" height="250" width="250" />',
                    '<br />' + albums[i],
                '</a>',
            '</li>'
        ]);
    }
    var message = albums.length ?
        '' :
        '<p>Hmm. No albums found. That\'s ... odd.</p>';
    var htmlTemplate = [
        message,
        '<ul>',
            getHtml(template),
        '</ul>',
        ];

    document.getElementById('albumlist').innerHTML = getHtml(htmlTemplate);
    document.getElementById('albums').style.display = "block";
}

// Show the photos that exist in an album.
function viewAlbum(albumName) {
    albumName = albumName.replace(/\+/g, ' ');
    var albumLabel = document.querySelector("#contents h2 span");
    if (albumLabel !== undefined) {
        albumLabel.innerHTML = albumName;
    }

    var photos = pdata.photos.filter(function(photo) {
        return photo.p.includes(albumName + '/');
    }, albumName);
    console.log(photos);
    var template = '';
    for (i in photos) {
        var components = photos[i].p.split('/');
        var imagePath = photos[i].p.replace(/\s/g, '+');
        components[0] = components[0].replace(/\s/g,'+');
        var photoThumbUrl = s3Endpoint + components[0] + '/' + components[1];
        template += getHtml([
            '<li>',
                '<a href="/' + imagePath + '">',
                    '<img src="' + photoThumbUrl + '" height="350" />',
                '</a>',
            '</li>'
        ]);
    }
    
    var message = photos.length ? '' : '<p>There are no photos in this album.</p>';
    var htmlTemplate = [
        message,
        '<ul>',
            getHtml(template),
        '</ul>'
    ]
    document.getElementById('pictures').innerHTML = getHtml(htmlTemplate);
    document.getElementById('contents').style.display = "block";
}

function showImage(image) {
    var hero = document.getElementById('hero');
    var path = s3Endpoint + image;
    hero.src = path;

    getEXIF(hero.src);

    document.getElementById('details').style.display = "block";
}

// Need an async function because the EXIF loader reads from the stream,
// which is non-blocking. Only when it's finished should it call the 
// function to update the meta info on the page
async function getEXIF(image) {
    var tags;
    try {
        tags = await ExifReader.load(image);
        delete tags['MakerNote'];
    } catch (error) {
        // Handle error.
        console.log('Unable to read EXIF');
    }
    showMeta(tags);
}

// This does the actual updating in the page, passed in the list of tags
// from getEXIF
function showMeta(tagsAvailable) {
    var hasTitle, hasCaption = false;
    for (let i in tagsAvailable) {
        var elem = document.getElementById(i);
        var tagdata = tagsAvailable[i].description;
        switch(i) {
            case 'DateTimeOriginal':
                const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                var tdinfo = tagdata.split(' ');
                var dateinfo = tdinfo[0].split(':');
                tagdata = '' + (parseInt(dateinfo[2])) + ' ' + months[parseInt(dateinfo[1])-1] + ' ' + dateinfo[0];
                break;
            case 'title':
                hasTitle = true;
                break;
            case 'description':
                hasCaption = true;
                break;
            case 'ExposureTime':
            case 'FNumber':
            case 'FocalLength':
            case 'ExposureBiasValue':
                break;
        }

        if (elem !== null) {
            elem.innerHTML = tagdata;
        }
    }

        if (tagsAvailable['GPSLatitude'] && tagsAvailable['GPSLongitude']) {
            var nsMod = (tagsAvailable['GPSLatitudeRef'].value[0]==="N")?'':'-';
            var ewMod = (tagsAvailable['GPSLongitudeRef'].value[0]==="E")?'':'-';
            var coords = ewMod + (tagsAvailable['GPSLongitude'].description);
            coords += ',' + nsMod + (tagsAvailable['GPSLatitude'].description);
            var mapURL = 'https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=300&height=200&center=lonlat:' + coords + '&marker=lonlat:' + coords + ';color:%23ff0000;size:medium&apiKey=567f0d30482f4ad8b8674c54af6613f5';
            document.getElementById('map6').src = mapURL + "&zoom=4";
            document.getElementById('map10').src = mapURL + "&zoom=10";
            document.getElementById('map16').src = mapURL + "&zoom=16";
        }

        if (!hasTitle) document.querySelector('#details h2').innerHTML = "Untitled";
        if (!hasCaption) document.querySelector('#details p').style.display = "none";
}

window.onload = getData;