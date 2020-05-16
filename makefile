build:
	docker-compose -f docker-compose.yml -f docker-compose_julia.yml -f docker-compose_app.yml build

run:
	docker-compose -f docker-compose.yml -f docker-compose_julia.yml -f docker-compose_app.yml up

clean:
	docker-compose -f docker-compose.yml -f docker-compose_julia.yml -f docker-compose_app.yml down

copy_julia:
	docker cp c3po_control_1:/usr/myapp/all_result_testcase2.csv 	results/all_result.csv
	docker cp c3po_control_1:/usr/myapp/control_inputs.csv 				results/all_control_inputs.csv
	docker cp c3po_control_1:/usr/myapp/measurements.csv 					results/all_measurements.csv
	docker cp c3po_control_1:/usr/myapp/result_testcase2.csv 			results/sel_result.csv
	docker cp c3po_control_1:/usr/myapp/select_control_inputs.csv results/sel_control_inputs.csv
	docker cp c3po_control_1:/usr/myapp/select_measurements.csv 	results/sel_measurements.csv

build_python:
	docker-compose -f docker-compose.yml -f docker-compose_python.yml build

run_python:
	docker-compose -f docker-compose.yml -f docker-compose_python.yml up

remove_python:
	docker-compose -f docker-compose.yml -f docker-compose_python.yml down
	
copy_python:
	docker cp c3po_control_1:/usr/src/app/controlInputsList.csv 	results/controlInputsList.csv

update:
	cd emulator/models/C3PO
	git pull
	cd ../../..


