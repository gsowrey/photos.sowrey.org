# photos.sowrey.org
Display system for all my photography

# TODO V3
- Rebuild in Hugo to automagically generate all the pages with:
    - Embedded EXIF data extracted from the images
    - HTML metadata extracted from the EXIF
    - Use extracted title + album to create path
        - And detect error if duplicates
- Will require pre-processor to build data file
- Need "static" pages (Home, All Albums) to generate from feeds
- Need feeds (sitemap + RSS)

See https://github.com/kidsil/hugo-data-to-pages
- Photos YAML file will need fields structure for EXIF and asset path
- Assets will need to be moved into Hugo-friendly pathing