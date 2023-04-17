var pdata; // Global variable for photo data

function getData() {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            var data = JSON.parse(this.responseText);
            getPhotoData(data);
        }
    }
    xhr.open('GET', '/assets.json', true);
    xhr.send(null);
}

// Gets the JSON'd XML data from S3 and breaks out the albums, pictures,
// and anything else needed to display the lists
function getPhotoData(data) {
    let pd = {albums:[],photos:[]};
    if (data && data !== null && data !== undefined && data.assets) {
        var as = data.assets;
        for (i in as) {
            for (j in as[i]) {
                if (!pd.albums.includes(i)) pd.albums.push(i);
                let photo = {
                    p: i + '/' + as[i][j][0],
                    d: as[i][j][1]
                }
                pd.photos.push(photo);
            }
        }
    }
    pd.albums.sort();
    pd.photos.sort((a,b) => (a.d < b.d) ? 1: ((b.d < a.d) ? -1 : 0));
    pdata=pd;
    updatePage();
}

// Primary page updater. When called, it looks at the URL and determines
// one of three page states: Home (album list), album contents, or
// image details
function updatePage() {
    var components = window.location.pathname.split('/');
    var menu = '<li><a href="/">Recent Pictures</a></li>'; // will always be present
    var callback;
    var albumPath = urlSafe(components[1]);
    var args;

    // By default, we get the recent images. But if you click on albums, you get
    // the list of all known albums
    if (components.length <= 2) {
        callback = 'showRecent';
    }
    else {
        menu += menu = '<li><a href="/albums/">All Albums</a></li>';
    }
    
    if (components[1] && components[1].includes('albums')) {
        callback = 'listAlbums';
    }
    else if ((components[1] && components[1] !== '' ) || 
        (components[2] && components[2] !== '' )) {
        // URL has no more than four parts: home, album list, album, and image
        // If the second or third components (which includes the second) are present,
        // then write in the second component (the album contents)
        menu += '<li><a href="/' + albumPath + '/">' + components[1].replace(/\+/g, ' ') + '</a></li>';
        callback = 'viewAlbum';
        args = components[1];
    }

    // If the third component is present (we assume the statement above has already
    // done its job), add the third component (the image)
    if (components[2] && components[2] !== '') {
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

function urlSafe(path) {
    return path.replace(/\s/g,'+');
}
function urlDisp(path) {
    return path.replace(/\+/g,' ');
}


function grover() {
    document.querySelector('#grover').addEventListener(
        "mouseover",
        (event) => {
            var showMap = '';
            switch (event.target.textContent) {
                case "Near":
                    showMap = "near";
                    break;
                case "(Pant,pant)":
                    showMap = "pantpant";
                    break;
                case "Far!":
                    showMap = "far";
                    break;
            }
            if (showMap !== '') {
                var map = document.getElementById('map');
                map.src = map.getAttribute('data-' + showMap);
            }
    });
}

function showRecent() {
    var photos = pdata.photos;
    var template = '';
    var maxrecent = 20;
    var count = 0;

    for (i in photos) {
        if (count>=maxrecent) break;
        var components = photos[i].p.split('/');
        var imagePath = urlSafe(photos[i].p);
        components[0] = urlSafe(components[0]);
        var photoThumbUrl = '/assets/' + components[0] + '/' + components[1];
        template += getHtml([
            '<li>',
                '<a href="/' + imagePath + '">',
                    '<img src="' + photoThumbUrl + '" height="250" />',
                '</a>',
            '</li>'
        ]);
        count++;
    }
    
    var message = photos.length ? '' : '<p>There are no recent photos...??</p>';
    var htmlTemplate = [
        message,
        '<ul>',
            getHtml(template),
        '</ul>',
        '<p><a href="/albums/">See all albums</a></p>'
    ]
    document.querySelector('#recent div').innerHTML = getHtml(htmlTemplate);
    document.getElementById('recent').style.display = "block";
}

// List the photo albums that exist in the bucket.
function listAlbums() {
    var albums = pdata.albums;
    var template = '';
    for (i in albums) {
        var albumPath = urlSafe(albums[i]);
        var albumName = urlDisp(albums[i]);
        var thumbPath = 'thumb_' + albumName.replace(/\s/g,'_');
        template += getHtml([
            '<li>',
                '<a href="/' + albumPath + '/">',
                    '<img src="/assets/' + thumbPath + '.jpg" height="250" width="250" />',
                    '<br />' + albumName,
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
    albumName = urlDisp(albumName);
    var albumLabel = document.querySelector("#contents h2 span");
    if (albumLabel !== undefined) {
        albumLabel.innerHTML = albumName;
    }

    var photos = pdata.photos.filter(function(photo) {
        return photo.p.includes(urlSafe(albumName));
    }, albumName);
    var template = '';

    for (i in photos) {
        var components = photos[i].p.split('/');
        var imagePath = urlSafe(photos[i].p);
        components[0] = urlSafe(components[0]);
        var photoThumbUrl = '/assets/' + components[0] + '/' + components[1];
        template += getHtml([
            '<li>',
                '<a href="/' + imagePath + '">',
                    '<img src="' + photoThumbUrl + '" height="250" />',
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

function getPrevNext(image) {
    var prevnext = [];
    var al = urlSafe(image.split('/')[0]);
    var ap = [];
    pd=pdata.photos;
    for (i in pd) {
        if (pd[i].p.includes(al)) ap.push(pd[i]);
    }
    for (i in ap) {
        if (ap[i].p.includes(urlSafe(image))) {
            var prev = (i<1)?ap.length-1:parseInt(i)-1;
            var next = (i>=ap.length-1)?0:parseInt(i)+1;
            prevnext = [ap[prev],ap[next]];
            break;
        }
    }
    return prevnext;
}

function showImage(image) {
    var hero = document.getElementById('hero');
    var search = urlDisp(image);
    hero.src = '/assets/' + image;

    getEXIF(hero.src);

    var pn = getPrevNext(search);
    if (pn.length == 2) {
        document.getElementById('prev').onclick = function() {window.location = "/" + urlSafe(pn[0].p);}
        document.getElementById('next').onclick = function() {window.location = "/" + urlSafe(pn[1].p);}
    }
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
    var hero=document.getElementById('hero');
    var padding = ((hero.clientHeight /2) - 183) + "px";
    document.getElementById('prev').style.paddingTop = padding;
    document.getElementById('next').style.paddingTop = padding;
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
            case 'ExposureBiasValue':
                tagdata=parseFloat(tagdata).toFixed(2);
                break;
            case 'ExposureTime':
                tagdata+='s';
                break;
            case 'FNumber':
            case 'FocalLength':
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
            var map = document.getElementById('map');
            map.src = mapURL + "&zoom=4";
            map.setAttribute('data-far',map.src);
            map.setAttribute('data-pantpant',mapURL + "&zoom=10");
            map.setAttribute('data-near',mapURL + "&zoom=16");
        }

        if (!hasTitle) document.querySelector('#details h2').innerHTML = "Untitled";
        if (!hasCaption) document.querySelector('#details p').style.display = "none";
}

window.onload = getData;