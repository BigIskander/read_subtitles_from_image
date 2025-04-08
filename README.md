# read_subtitles_from_image

[По русски](README_RUS.md)

This is the program made to recognize text (subtitles) in case when they are part of an image. 

This is the instruction for version 1.1, instruction for version 1.0 is located in v1.0 branch of this repository.

This program is created to recognize text from an image, so then unknown words can easily be searched and found in a dictionary.

I wrote this program with the purpose of learning chinese language, for that reason the default settings is set up to recognize text in chinese language.

From technical point of view this program works as frontend (as GUI or graphical shell) to OCR (Optical Character Recognition) program. This program cuts selected part of an image with text in it, processes the image depending on settings and then sends it to OCR program to recognize text, then displays the result. At the moment programm support 2 OCR engines: Tesseract OCR and PaddleOCR.

## How to use the programm

To recognize the text you need: select the part of an image with text in it and press "Recognize selected text.". Sometimes, for better text recognition you might need to tweak some settings. Below in the video demonstration is shown how this program works.

Video demonstration (version 1.0):

https://github.com/user-attachments/assets/6d610ada-971e-4d68-a9fd-2eb6c52160c4

For video demonstration I used print screen made from the show [The Beauty Blogger](https://wetv.vip/en/play/qgvq32ixh4yujoc-The%20Beauty%20Blogger/o0029e5dqz9-EP19%EF%BC%9AThe%20Beauty%20Blogger), made when subtitles turned on.

## How to install and set up

You can find compiled binaries (installation files) with program in [releases](https://github.com/BigIskander/read_subtitles_from_image/releases) page.

The program is available for operating systems Linux, Windows and macOS.

In order for program to work you also need to install [Tesseract OCR](https://tesseract-ocr.github.io/) and/or [PaddleOCR](https://paddlepaddle.github.io/PaddleOCR/main/en/index.html).

There is also [version of the program working in docker](https://hub.docker.com/r/bigiskander/read_subtitles_from_image). In this version everything necessary for program to work is already set up and included in the image of [docker](https://www.docker.com/) container.

### In case of using with Tesseract OCR
1. install Tesseract OCR [by this instruction](https://github.com/tesseract-ocr/tesseract?tab=readme-ov-file#installing-tesseract)
2. add [.traineddata](https://github.com/tesseract-ocr/tessdata) files (with pretrained data to recognize the text)
3. in program settings choose the path of **tesseract.exe** or (**tesseract** in Linux and MacOS) file and path containing .traineddata files
4. in program settings set the list of languages used to recognize the text. Names of the languages are separated by semicolon (;), names of the languages corresponds to names of .traineddata files without extension.

**Note:** In case of using with Tesseract OCR. I would recommend to install tesseract 4 (instead of tesseract 5). Because the results is the most accurate when using with tesseract 4 (at least for recognition of text in Chinese language).

By default language is set up as chi_all, .traineddata file for which, can be donwnloaded from: https://github.com/gumblex/tessdata_chi (file chi_all.traineddata)

### In case of using with PaddleOCR
1. install python3 vestion 3.8. I would recommend to install python working in conda envitonment [by this instruction](https://paddlepaddle.github.io/PaddleOCR/main/en/ppocr/environment.html) and then install PaddleOCR inside conda environment, because some dependencies might conflict with already existing python environment.
2. activate conda environment and install PaddleOCR:
   ```
    conda activate paddle_env

    python -m pip install paddlepaddle==3.0.0rc1 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/

    pip install "paddleocr>=2.0.1"
    ```
3. in program settings choose the path of **python.exe** (or **python** in Linux and MacOS) file. You can find file location by executing this commands:
    
    in Window and MacOS
    ```
    conda activate paddle_env
    where python
    ```

    in Linux
    ```
    conda activate paddle_env
    which python
    ```
4. in program settings set the list of languages uset to recognize text. Names of the languages are separated by semicolon (;), names of the languages corresponds to abbreviations from [the table of supported languages](https://paddlepaddle.github.io/PaddleOCR/main/en/ppocr/blog/multi_languages.html#5-support-languages-and-abbreviations).

## For developers

In version running inside docker container, [FastAPI](https://fastapi.tiangolo.com/) is used as backend server.

In version build with using [electronjs](https://www.electronjs.org/), electronjs's own API is used as backend.

To set up development environment you need to install [nodejs](https://nodejs.org/en) version 20 or newer and install python3 version 3.8.

After that, install necessary OCR programs, look higher.

Then install dependencies:
```
pip install "fastapi[standard]"
npm install
cd electron
npm install
cd ..
```

To run in development environment (vite + FastAPI):
```
npm run dev_fastapi
```
and in separate terminal
```
npm run dev_vite
```

To compile (vite):
```
npm run build
```

To run electronjs version in development environment:
```
npm run electron
```

To compile electronjs version:
```
npm run build
npm run electron_build
```
