# isrm
Interactive Schedule Reduction Model

Prototype application to demonstrate browser- and service-based modeling and simulation methods as discussed in [1]. The constituent design flow model is drawn from past work [2] and available [here](http://cps-vo.org/node/2691) (file path: `UTRC_CODA.r5.2.zip\UTRC_CODA\Design_Flow\Design Flow Modeling\META System Dynamics Model v3`) as a Vensim file released under a Creative Commons 2.5 license.

This demonstration shows both standalone and service-based tools to execute and visualize model results.

Prerequisites:
 * [Git client](https://help.github.com/articles/set-up-git/)
 * [Node.js](http://nodejs.org/)
 * [MongoDB](http://www.mongodb.org/)

Installation/start-up instructions:
1. Clone this repository
2. Install dependent Node modules (run command `npm install` from project root)
3. Create data directory (recommended to make in project root, e.g. `mkdir data`)
4. Start MongoDB service (run command `mongod --dbpath /path/to/data` from MongoDB bin folder)
5. Start Node execution (run command `npm start` from project root)
6. Open a web browser to `localhost:3000`

Please contact the author with any questions.

1. Grogan, P. T., O. L. de Weck, A. M. Ross, and D. H. Rhodes, "Interactive models as a system design tool: Applications to system project management", 2015 Conference on Systems Engineering Research, March 2015, to appear.
2. de Weck, O. L., "Feasibility of a 5X Speedup in System Development Due to META Design," International Design Engineering Technical Conferences & Computers and Information in Engineering Conference, Chicago, Illinois, August 2012.