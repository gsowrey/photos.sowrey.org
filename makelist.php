<?php 
$rii = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('assets'));
$files = array(); 

/** @var SplFileInfo $file */
foreach ($rii as $file) {
    if (strpos(strtolower($file->getPathname()),'jpg') &&
        !strpos(strtolower($file->getPathname()),'thumb')) {
        $search = array('assets/');
        $path = str_replace($search,'',$file->getPathname());
        $mtime = filemtime($file);

        $components = explode('/',$path);
        if (!is_null($components[0]) && !is_null($components[1])) {
            $files[$components[0]][] = array($components[1],$mtime);            
        }
    }     
}
$assets = array('assets' => $files);
file_put_contents('assets.json', json_encode($assets));