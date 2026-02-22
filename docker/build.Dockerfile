FROM node:lts-bullseye

WORKDIR /app
RUN npm install -g @anthropic-ai/claude-code
# this step is optional because file mount can work
# If you want to AI doing refacting and building sametime or even hot reloading you need it
#COPY ./ /app 

EXPOSE 22
# keep code session alive
CMD ["bash"]
