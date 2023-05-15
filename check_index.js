const { dir } = require("console");
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
            imgPath = imgPath.substring(imgPath.indexOf('content/')+8);
            if (!imgPath.includes('thumb') && !imgPath.includes('DS_Store') && imgPath !== "_index.md") {
                arrayOfFiles.push(imgPath);
            }
        }
    });
    
    return arrayOfFiles
}

function getDirectories(files) {
    let directories = [];

    for (i in files) {
        var parts = files[i].split('/');

        if (parts[0] !== 'photos') {
            var path = parts[0];
            if (!directories.includes(path)) directories.push(path);
            if (parts[1] !== undefined && parts[1] !== "_index.md") path +=  '/' + parts[1];
            if (!directories.includes(path)) directories.push(path);
        }
    }
    return directories;
}

function checkIndex(files) {
    var newIndex = false;
    var contentDir = "content/";
    var indexFile = "_index.md";
    var directories = getDirectories(files);

    if (directories !== undefined) {
        for (i in directories) {
            var parts = directories[i].split('/');
            var path = contentDir + directories[i] + '/' + indexFile;

            if (fs.existsSync(path)) {
                //console.log(path + ' exists');
            }
            else {
                console.log('Creating index: ' + path);

                var countreg = (parts.length === 1) ? "country: ":"region: ";
                var countregname = (parts.length === 1) ? parts[0] : parts[1];
                var content = "---\ntitle: " + countregname + "\ntype: geolist\n" + countreg + "true\n---\nREPLACE THIS TEXT";

                fs.writeFile(path,content, err => {
                    if (err) {
                        console.error(err);
                    }
                    else {
                        console.log("Index file created.");
                    }
                });
            
                newIndex = true;
            }
        }
    }
    return newIndex;
}

var files = getAllFiles('./content');
var newIndex = checkIndex(files);
if (newIndex) process.exitCode = 1; // make sure error code noticed
