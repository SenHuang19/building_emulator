build:
	docker-compose build

remove-image:
	docker-compose down

run:
	docker-compose up

update:
	cd emulator/models/C3PO
	git pull
	cd ../../..

copy:
	mkdir -p results
	docker cp c3po_control_1:/usr/myapp/all_result_testcase2.csv 	results/all_result.csv
	docker cp c3po_control_1:/usr/myapp/control_inputs.csv 				results/all_control_inputs.csv
	docker cp c3po_control_1:/usr/myapp/measurements.csv 					results/all_measurements.csv
	docker cp c3po_control_1:/usr/myapp/result_testcase2.csv 			results/sel_result.csv
	docker cp c3po_control_1:/usr/myapp/select_control_inputs.csv results/sel_control_inputs.csv
	docker cp c3po_control_1:/usr/myapp/select_measurements.csv 	results/sel_measurements.csv
