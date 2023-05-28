const fs = require('fs');
   
// Rename the file
/*fs.rename('hello.txt', 'world.txt', () => {
  console.log("\nFile Renamed!\n");
   
  // List all the filenames after renaming
  getCurrentFilenames();
});*/
   
// Function to get current filenames
// in directory
function cleanFilenames() {
  fs.readdirSync('./').forEach(file => {
    if (file !== '.DS_Store') {
        var newfile = file.replace(/[^A-Za-z0-9_\.]+/g,'-');
        fs.rename(file,newfile,() => {
            console.log(file + " -> " + newfile);
        });
    }
  });
}

cleanFilenames();