<?php 
$rid = new RecursiveDirectoryIterator('assets');
$rii = new RecursiveIteratorIterator($rid);
$files = array(); 

/** @var SplFileInfo $file */
foreach ($rii as $file) {
    if (strpos(strtolower($file->getPathname()),'jpg') &&
        !strpos(strtolower($file->getPathname()),'thumb')) {
        $exif = exif_read_data($file);
        $search = array('assets/');
        $path = str_replace($search,'',$file->getPathname());
        $mtime = strtotime($exif["DateTimeOriginal"]);

        $components = explode('/',$path);
        if (!is_null($components[0]) && !is_null($components[1])) {
            $files[$components[0]][] = array($components[1],$mtime);            
        }
    }     
}
$assets = array('assets' => $files);
file_put_contents('assets.json', json_encode($assets));