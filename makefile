# basic makefile commends to manage the life-cycle of a docker image.


ifeq ($(OS),Windows_NT)
   MKDIR = cmd /C mkfolder.bat
else
   MKDIR = bash mkfolder.sh   
endif


build:
	make mkfolder
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml build

run:
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml up
	
copy:
	docker cp python:/usr/src/app/controlInputsList.csv 	interfaceLists/controlInputsList.csv
	docker cp python:/usr/src/app/measurementsList.csv 		interfaceLists/measurementsList.csv
	docker cp python:/usr/src/app/results.csv 						results/results.csv

mkfolder:
	$(MKDIR)

remove:
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml down

run_emulator:
	docker-compose -f docker-compose_emulator.yml up	