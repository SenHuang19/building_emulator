# basic makefile commends to manage the life-cycle of a docker image.


START_PORT ?= 5000
NUM_EMULATORS ?= 1

ifeq ($(OS),Windows_NT)
   MKDIR = cmd /C mkfolder.bat
   MKENV = cmd /C mkenv.bat $(START_PORT) $(NUM_EMULATORS)
else
   MKDIR = bash mkfolder.sh   
   MKENV = bash mkenv.sh $(START_PORT) $(NUM_EMULATORS)
endif


build: mkenv
	make mkfolder
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml build

run: mkenv
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml up
	
copy:
	docker cp python:/usr/src/app/controlInputsList.csv 	interfaceLists/controlInputsList.csv
	docker cp python:/usr/src/app/measurementsList.csv 		interfaceLists/measurementsList.csv
	docker cp python:/usr/src/app/results.csv 						results/results.csv

mkfolder:
	$(MKDIR)

mkenv:
	$(MKENV)

remove:
	docker-compose -f docker-compose_emulator.yml -f docker-compose_python.yml down

ifeq ($(NUM_EMULATORS),1)
  RUN_EMUL_OPTS ?= 
else
  RUN_EMUL_OPTS ?= -d --no-recreate --scale emulator=$(NUM_EMULATORS)
endif

run_emulator: mkenv
	docker-compose -f docker-compose_emulator.yml up $(RUN_EMUL_OPTS)
