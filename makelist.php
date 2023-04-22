<?php 
$rid = new RecursiveDirectoryIterator('static/photos'); // Gets the root asset folder
$rii = new RecursiveIteratorIterator($rid); // builds the iterator to go through the assets hierarchy
$files = array(); 

foreach ($rii as $file) {
    $pathname = $file->getPathname();
    if (strpos(strtolower($pathname),'jpg') &&
        !strpos(strtolower($pathname),'thumb')) { // if we find an image that's not a thumbnail
        $exif = exif_read_data($file, 'ANY_TAG', true); // get the EXIF info (I know, I know, but we need the creation date)
        var_dump($exif);
        /*$exif_data = array(
            'height' => $exif['COMPUTED']['Height'],
            'width' => $exif['COMPUTED']['Width'],
            'ApertureFNumber' => $exif['COMPUTED']['ApertureFNumber'],
            'Description' => $exif['ImageDescription'],
            'Make' => $exif['Make'],
            'Model' => $exif['Model'],
            'ExposureTime' => $exif['ExposureTime'],
            'ISO' => $exif['ISOSpeedRatings'],
            'DateTimeOriginal' => $exif['DateTimeOriginal'],
            'ShutterSpeedValue' => $exif['ShutterSpeedValue'],
            'ApertureValue' => $exif['ApertureValue'],
            'ExposureBiasValue' => $exif['ExposureBiasValue'],
            'MaxApertureValue' => $exif['MaxApertureValue'],
            'MeteringMode' => $exif['MeteringMode'],
            'FocalLength' => $exif['FocalLength'],
            'Lens' => $exif['UndefinedTag:0xA434'],
            'DateTimeOriginal' => $exif['DateTimeOriginal'],
            'DateTimeOriginal' => $exif['DateTimeOriginal'],
            'DateTimeOriginal' => $exif['DateTimeOriginal'],
        );

        for ($id = 1; $id <= 65535; $id++)
        {
        $dec2hex = dechex($id);
        
        $strgx = '0x'. $dec2hex;
        
        if(exif_tagname($id) != "")
        {
        var_dump( $strgx . ' ( ' . exif_tagname($id) . ' )');
        }
        }*/
        die;





        $search = array('static/photos');
        $path = str_replace($search,'',$file->getPathname()); // Remove "assets/" from the pathname
        $mtime = strtotime($exif["DateTimeOriginal"]); // get the creation date

        $components = explode('/',$path);
        if ($components[1] && $components[2] && 
            !is_null($components[1]) && !is_null($components[2])) { 
            $files[$components[1]][] = array($components[2],$mtime); // builds array of [<Place>][<image>], which will get JSON'd later            
        }
    }     
}
$assets = array('assets' => $files); // JSON needs to open with a head element, "assets"
//file_put_contents('assets.json', json_encode($assets)); // write out the file in JSON format
file_put_contents('data/photos.yaml',yaml_emit($files));