# read_subtitles_from_image

[In english](README.md)

Программа для распознавания текста (субтитров), являющегося частью изображения.

Это инструкция для версии 1.1, инструкция для версии 1.0 находится в ветке v1.0 этого репозитория.

Программа предназначена для распознавания текста из изображения, с целью, чтобы потом незнакомые слова можно было легко найти и посмотреть в словаре. 

Программу писал для изучения китайского языка, поэтому, по умолчанию стоят настройки для распознавания китайского языка.

С технической точки зрения программа выступает как frontend (как GUI или графическая оболочка) к программе распознование текста с изображения. Эта программа вырезает из общего изображения нужный участок с текстом, обрабатывает его в зависимости от настроек и отправляет в программу распознавания текста для распознавания текста, затем отображает полученный результат. На данный момент поддерживается 2 программы распознавания текста: Tesseract OCR и PaddleOCR.   

## Как пользоваться программой

Для того, чтобы распознать текст нужно: выделить нужный участок текста и нажать "Recognize selected text.". Иногда, для лучшего распознавания текста, может понадобиться переключить некоторые настройки. Ниже представлена видеодемонстрация работы программы.

Видео демонстрация (версия 1.0):

https://github.com/user-attachments/assets/6d610ada-971e-4d68-a9fd-2eb6c52160c4

Для видео демонстрации я использовал снимок с экрана шоу [The Beauty Blogger](https://wetv.vip/en/play/qgvq32ixh4yujoc-The%20Beauty%20Blogger/o0029e5dqz9-EP19%EF%BC%9AThe%20Beauty%20Blogger), сделанный когда субтитры включены.

## Как установить и настроить

Вы можете найти уже скомпилированные бинарные (установочные) файлы с программой на странице релизов ([releases](https://github.com/BigIskander/read_subtitles_from_image/releases)).

Программа доступна для операционных системм Linux, Windows и macOS.

Для работы программы так же требуется установить: [Tesseract OCR](https://tesseract-ocr.github.io/) и/или [PaddleOCR](https://paddlepaddle.github.io/PaddleOCR/main/en/index.html).

Доступна так же [версия программы работающая в docker](https://hub.docker.com/r/bigiskander/read_subtitles_from_image). В этой версии все необходимое для работы программы уже настроено и встроено в образ [docker](https://www.docker.com/) контейнер.

### В случае использования с Tesseract OCR
1. установить Tesseract OCR [по этой инструкции](https://github.com/tesseract-ocr/tesseract?tab=readme-ov-file#installing-tesseract) 
2. добавить файлы [.traineddata](https://github.com/tesseract-ocr/tessdata) (с предтренированными данными для распознавания текста) 
3. в настройках программы указать расположения файла **tesseract.exe** или (**tesseract** в Linux и MacOS) и папку, в которой распологаются файлы .traineddata
4. в настройках программы указать список языков, применяемых для распознования текста. Названия языков разделены знаком точка с запятой (;), название языка соответсвует названию файла .traineddata без учета расширения.

***Примечание:*** В случае использования с Tesseract OCR. Я бы рекомендовал установить tesseract 4 (вместо tesseract 5). Так как результаты наиболее точные при использовании с tesseract 4 (по крайней мере, при распознавании текста на китайском языке).

По умолчанию указан язык распознавания chi_all, .traineddata  файл,  к которому можно скачать из: https://github.com/gumblex/tessdata_chi (файл chi_all.traineddata)

### В случае использования с PaddleOCR
1. установить python3 версии 3.8. Я бы рекомендовал установить python, работающий в conda окружении по [этой инструкции](https://paddlepaddle.github.io/PaddleOCR/main/en/ppocr/environment.html) и затем установить PaddleOCR в conda окружении, так как некоторые зависимости могут конфликтовать с уже существующим окружением pyton.
2. активировать conda окружение и установить PaddleOCR:
    ```
    conda activate paddle_env

    python -m pip install paddlepaddle==3.0.0rc1 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/

    pip install "paddleocr>=2.0.1"
    ```
3. в настройках программы указать расположение файла **python.exe** (или **python** в Linux и MacOS). Расположение файла можно узнать выполнив следующие комманды:
    
    в Window и MacOS
    ```
    conda activate paddle_env
    where python
    ```

    в Linux
    ```
    conda activate paddle_env
    which python
    ```
4. в настройках программы указать список, языков применяемых для распознования текста. Названия языков разделены знаком точка с запятой (;), название языка соответсвует аббревиации из [таблицы со списком поддерживаемых языков](https://paddlepaddle.github.io/PaddleOCR/main/en/ppocr/blog/multi_languages.html#5-support-languages-and-abbreviations).

## Для разработчиков

В версии, запускаемой в docker контейнере, в качестве backend используется сервер [FastAPI](https://fastapi.tiangolo.com/). 

В версии, построенной с использованием [electronjs](https://www.electronjs.org/), в качестве backend используется собственный API интерфейс фреймворка electronjs.

Для того, чтобы настроить среду разработки, нужно установить [nodejs](https://nodejs.org/en) версии 20 или новее и так же установить python3 версии 3.8.

После чего, установить требуемые программы для распознавания текста, смотрите выше.

Далее, установить зависимости:
```
pip install "fastapi[standard]"
npm install
cd electron
npm install
cd ..
```

Для того, чтобы запустить в среде разработки (vite + FastAPI):
```
npm run dev_fastapi
```
и в одтельном терминале
```
npm run dev_vite
```

Для компиляции (vite):
```
npm run build
```

Запустить electronjs версию в среде разработки:
```
npm run electron
```

Скомпилировать electronjs версию:
```
npm run build
npm run electron_build
```
