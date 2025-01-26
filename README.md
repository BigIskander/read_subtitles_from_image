# read_subtitles_from_image

[По русски](README_RUS.md)

This is the program made to recognize text (subtitles) in case when they are part of an image. 

This program is created to recognize text from an image, so then unknown words can easily be searched and found in a dictionary.

I wrote this program with the purpose of learning chinese language, for that reason the default settings is set up to recognize text in chinese language.

From technical point of view this program works as frontend (as GUI or graphical shell) to the program tesseract-ocr. This program cuts selected part of an image with text in it, processes the image depending on settings and then sends it to tesseract-ocr program to recognize text, then displays the result. Tesseract-ocr by itself doesn't have graphical user interface. 

## How to use the programm

To recognize the text you need: select the part of an image with text in it and press "Recognize selected text.". Sometimes, for better text recognition you might need to tweak some settings. Below in the video demonstration is shown how this program works.

Video demonstration:

https://github.com/user-attachments/assets/6d610ada-971e-4d68-a9fd-2eb6c52160c4

For video demonstration I used print screen made from the show [The Beauty Blogger](https://wetv.vip/en/play/qgvq32ixh4yujoc-The%20Beauty%20Blogger/o0029e5dqz9-EP19%EF%BC%9AThe%20Beauty%20Blogger), made when subtitles turned on.

## How to install and set up

You can find compiled binaries (installation files) with program in [releases](https://github.com/BigIskander/read_subtitles_from_image/releases) page.

The program is available for operating systems Linux, Windows and macOS.

In order for program to work you also need to install [tesseract-ocr](https://tesseract-ocr.github.io/) and add [.traineddata](https://github.com/tesseract-ocr/tessdata) files (with pretrained data to recognize the text).

**Note:** I would recommend to install tesseract 4 (instead of tesseract 5). Because the results is the most accurate when using with tesseract 4 (at least for recognition of text in Chinese language).

Then in the settings of the program set up folder where tesseract is located and folder where .traineddata files are located. Or as alternative you can add these folders to PATH variable of your operating system. Then you need to set up language of recognizing text.

By default language is set up as chi_all, .traineddata file for which, can be donwnloaded from: https://github.com/gumblex/tessdata_chi (file chi_all.traineddata)

There is also [version of the program working in docker](https://hub.docker.com/r/bigiskander/read_subtitles_from_image). In this version everything necessary for program to work is already set up and included in the image of [docker](https://www.docker.com/) container.

## For developers

In version running inside docker container, [expressjs](https://expressjs.com/) is used as backend server.

In version build with using [electronjs](https://www.electronjs.org/), electronjs's own API is used as backend.

To set up development environment you need to install [nodejs](https://nodejs.org/en) version 20 or newer.

Then install dependencies:
```
npm install
cd electron
npm install
cd ..
```

To run in development environment (vite + expressjs):
```
npm run dev
```

To compile (vite + expressjs):
```
npm run build
```

To run electronjs version in development environment:
```
npm run electron
```

To compile electronjs version:
```
npm run just_build
npm run electron_build
```
