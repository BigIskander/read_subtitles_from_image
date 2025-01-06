cd ./dist
if [ "$1" != "ia32" ] && [ "$1" != "x64" ] && [ "$1" != "arm64" ] ; then exit; fi
#delete if that filename already exists
for f in *_$1.exe; do rm "./$f"; done
#rename .exe file                       
for f in *.exe; do 
    if [[ $f != *"_ia32"* ]] && [[ $f != *"_x64"* ]] && [[ $f != *"arm64"* ]]; then
        mv "$f" "$(echo $f | sed s/.exe/_$1.exe/)";
    fi 
done 
cd ..