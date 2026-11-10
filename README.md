# Integration_Deploiement
## TP1
### Manip conteneur
1)
C:\Users\simon>docker --version
Docker version 29.9.2, build a82e528

2)
C:\Users\simon>docker images
                                                                                                    i Info →   U  In Use
IMAGE   ID             DISK USAGE   CONTENT SIZE   EXTRA

3)
C:\Users\simon>docker pull hello-world
Using default tag: latest
latest: Pulling from library/hello-world
4f55086f7dd0: Pull complete
d5e71e642bf5: Download complete
Digest: sha256:c567b231f65614688711a75f31518a064258a51d442117a3e771a3a8fdba78ef
Status: Downloaded newer image for hello-world:latest
docker.io/library/hello-world:latest

4)
C:\Users\simon>docker run hello-world

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/

5)
C:\Users\simon>docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES

6)
C:\Users\simon>docker ps -a
CONTAINER ID   IMAGE         COMMAND    CREATED              STATUS                          PORTS     NAMES
c2d8e1ec3339   hello-world   "/hello"   About a minute ago   Exited (0) About a minute ago             mystifying_ritchie

7)
C:\Users\simon>docker rm c2d8e1ec3339
c2d8e1ec3339

8)
C:\Users\simon>docker rmi c567b231f656
Untagged: hello-world:latest
Deleted: sha256:c567b231f65614688711a75f31518a064258a51d442117a3e771a3a8fdba78ef

### Serveur Web
1)
C:\Users\simon>docker pull nginx
Using default tag: latest
latest: Pulling from library/nginx
6d2e43921e9e: Pull complete
1962e1ff75b4: Pull complete
bbb080c71d50: Pull complete
1724c05f72c6: Pull complete
7cb4701ce7cd: Pull complete
37fb86c2a767: Pull complete
512ac5e7ce8e: Pull complete
4582dace95e2: Download complete
d2c7e31f04a3: Download complete
Digest: sha256:165ddde8751e75a1c907d24ef10d9f6deb08b57e0fe56caf67512486aff76d82
Status: Downloaded newer image for nginx:latest
docker.io/library/nginx:latest

2)
C:\Users\simon>docker run -d -p 8080:80 --name mon_nginx nginx
4f44861f147004c6a8005129277558ee07a22fd023f9ec683ef23961042042b3

3)
C:\Users\simon>docker ps
CONTAINER ID   IMAGE     COMMAND                  CREATED         STATUS         PORTS                                     NAMES
4f44861f1470   nginx     "/docker-entrypoint.…"   9 seconds ago   Up 8 seconds   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp   mon_nginx

5)
C:\Users\simon>docker stop mon_nginx
mon_nginx

6)
C:\Users\simon>docker rm mon_nginx
mon_nginx

## TP2
### Optimiser le dockerfile
#### Analyse du code et Dockerfile
- le fichier s'appelle dockerfile or la commande docker cherche un fichier nommé Dockerfile
- dockerfile utilise node:latest : le contenu de l’image peut changer sans modification du projet. Le lancement Docker peut devenir instable.
- dockerfile copie node_modules depuis la machine hôte, puis réinstalle les dépendances. On alourdit donc le processus de construction.
- dockerfile expose trois ports mais le serveur n'écoute par défaut que le 3000
- la route /big du serveur charge entièrement le fichier en mémoire ce qui peut bloquer le traitement en cas de fichier trop lourd.
- l'absence de fichier dans la route /big envoie un message d'erreur mais sous forme de réponse normale et non 404
- mention de MongoDb dans le package Json qui ne semble pas utile dans l'app
- le format de log ne semble pas très utile. il ne renseigne ni le statut de la réponse, ni sa durée, ni une indication d'erreur mais seulement l'heure, la méthode et l'URL. De plus copier l'URL directement ouvre à la collecte de données personnelles selon les paramètres de la requête
-On utilise des APT qui ne sont pas utiles dans l'application qui sont build-essentials, ca-certificates et locales.

#### Proposer des solutions
- On renomme le fichier Dockerfile, cela n'a pas d'impact sur la performance ni la taille de l'image
- On remplace node:latest par node:24.22.2-bookworm pour fixer la version LTS de Node.js et la version de Debian utilisée.
Mesure avant (node:latest, Node.js 26.13.0) : image de 1 884 189 108 octets ; latence moyenne de 10,45 ms (médiane : 9,05 ms sur 10 requêtes).
Mesure après (node:24.22.2-bookworm) : image de 1 727 982 255 soit 8% de moins, aucun changement de performance mais plus de stabilité.
- Le Dockerfile copie maintenant package.json et package-lock.json, exécute npm ci, puis copie le code. Aussi, j'ai ajouté un .dockerignore. Le .dockerignore empêche notamment l'envoi du dossier local node_modules au démon Docker. Pas de gain de taille ou de performance mais un contexte de construction beaucoup plus petit, passant de 87kb à 549 octets.
- On supprime les deux ports non écoutés. Pas de gain de taille ni de performance significatives mais on évite d'écouter des ports que nous n'utilisons pas.
- Pour la route /big, on remplace la lecture synchrone complète par un flux de lecture et de transformation. Le serveur conserve la conversion des retours à la ligne en <br/>, mais peut maintenant traiter d'autres requêtes pendant l'envoi du fichier.
Comparaison avec un fichier temporaire de 64 Mio, 30 requêtes vers / envoyées pendant le transfert de /big : avant, transfert en 474,71 ms ; latence moyenne de / de 14,29 ms.
Après : transfert en 267,38 ms ; latence moyenne de / de 2,47 ms. Les 64 Mio ont été reçus dans les deux cas. La taille de l'image reste la même.
- Si le fichier de /big est absent, la route conserve le message « Fichier introuvable » et renvoie maintenant le statut HTTP 404. C'est une correction fonctionnelle : aucune amélioration de taille ou de performance n'est attendue.
- MongoDB n'étant pas utilisé par le code, on retire cette dépendance de package.json et package-lock.json avec npm uninstall mongodb. Cela évite d'installer et d'embarquer le pilote et ses dépendances.
Avant : image de 1 734 180 165 octets.
Après : image de 1 720 014 640 octets, soit 14 165 525 octets (environ 0,82 %) de moins.
- Le middleware de logs écrit maintenant une ligne JSON après chaque réponse terminée, avec l'horodatage, la méthode, le chemin, le statut HTTP et la durée. Il utilise req.path pour exclure les paramètres de requête qui pourraient contenir des données sensibles. Ce changement n'affecte pas les performances et la taille de l'image.
- Pour réduire la taille on retire l'installation APT de build-essential, ca-certificates et locales, inutiles au fonctionnement de cette application.
Avant : image de 1 720 014 640 octets.
Après : image de 348 286 383 octets soit 1 371 728 257 octets (environ 79,8 %) de moins.