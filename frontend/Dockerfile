FROM python:3

ADD input /home/developer/input/

ADD static /home/developer/static/

ADD templates /home/developer/templates/

ADD requirements.txt /home/developer/

ADD frontend.py /home/developer/

WORKDIR /home/developer/
RUN pip install -r requirements.txt