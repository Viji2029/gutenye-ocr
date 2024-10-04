To run this experiment, follow the below steps:
1. Go to the foloder "packages/common" and do the following:
      - run `yarn link` .
      - run `yarn`
      - run `./ake.sh build`
2.  Go to the foloder "packages/model" and do the following:
      - run `yarn link` .
      - run `yarn`
      - run `./ake.sh build`
    If you are replacing the models in assets, with a different name, update them in node.js
3. Go to the foloder "packages/node" and do the following:
      - run `yarn link @gutenye/common`  and `yarn link @gutenye/ocr-model`
      - run `yarn`
      - run `./ake.sh build`
4. Now in the current directory, run `yarn`
5. You can start text detection by running `yarn start`
        - to detect  for images in a folder uncomment the line `runOCRForImages();`
        - to detect for images by reading from a file uncomment the line `runOCRForURLs();` 
6. Results are saved in json only when images are read from urls. These results can be visualised in a html file by running `node genHTML.js`
