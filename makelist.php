<?php 
$rid = new RecursiveDirectoryIterator('assets'); // Gets the root asset folder
$rii = new RecursiveIteratorIterator($rid); // builds the iterator to go through the assets hierarchy
$files = array(); 

foreach ($rii as $file) {
    if (strpos(strtolower($file->getPathname()),'jpg') &&
        !strpos(strtolower($file->getPathname()),'thumb')) { // if we find an image that's not a thumbnail
        $exif = exif_read_data($file); // get the EXIF info (I know, I know, but we need the creation date)
        $search = array('assets/');
        $path = str_replace($search,'',$file->getPathname()); // Remove "assets/" from the pathname
        $mtime = strtotime($exif["DateTimeOriginal"]); // get the creation date

        $components = explode('/',$path);
        if (!is_null($components[0]) && !is_null($components[1])) { 
            $files[$components[0]][] = array($components[1],$mtime); // builds array of [<Place>][<image>], which will get JSON'd later            
        }
    }     
}
$assets = array('assets' => $files); // JSON needs to open with a head element, "assets"
file_put_contents('assets.json', json_encode($assets)); // write out the file in JSON format