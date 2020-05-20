FROM julia:1.2.0-buster

RUN julia -e "using Pkg; Pkg.add(\"HTTP\");Pkg.add(\"JSON\");Pkg.add(\"CSV\");Pkg.add(\"DataFrames\");Pkg.add(\"Dates\")"

ADD interface.jl /usr/myapp/

ADD controllers.jl /usr/myapp/

ADD exogenous.jl /usr/myapp/

ADD test.jl /usr/myapp/

ADD custom_input/occParams.out /usr/myapp/

ADD temp_files_for_testing/appList.json /usr/myapp/
