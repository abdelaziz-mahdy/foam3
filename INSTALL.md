# Installation
## Linux / Chromebook
Install java, nodejs and maven, if required. On Linux, you can do this with:

    sudo apt-get install default-jdk
    sudo apt-get install maven
    sudo apt-get install nodejs
    sudo apt-get install npm

## MacOS
Install java, nodejs, brew, nvm and maven, if required.

Install Brew (with directions from [https://brew.sh/](https://brew.sh/)):

    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo >> /Users/kevingreer/.zprofile
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> /Users/kevingreer/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"

Install the Node Version Manager (NVM):

    brew upgrade
    brew install nvm
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
    echo '[ -s "$(brew --prefix nvm)/nvm.sh" ] && \. "$(brew --prefix nvm)/nvm.sh"' >> ~/.zshrc
    echo '[ -s "$(brew --prefix nvm)/etc/bash_completion.d/nvm" ] && \. "$(brew --prefix nvm)/etc/bash_completion.d/nvm"' >> ~/.zshrc
    source ~/.zshrc

Install NodeJS

    nvm install 22

Install Java

    brew install java
    echo 'export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"' >> ~/.zshrc

Install Maven

    brew install maven

Git Clone

    https://github.com/kgrgreer/foam3.git

Setup /opt Directory

    sudo mkdir /opt/foam-full
    sudo mkdir /opt/foam-full/logs
    sudo mkdir /opt/foam-full/journals
    sudo chown -R $USER /opt/foam-full
    sudo chown -R $USER /opt/foam-full/logs
    sudo chown -R $USER /opt/foam-full/journals

Start Server

    ./build.sh

Test Server

connect to [http://localhost:8080/](http://localhost:8080/) and use user username and password: foam-admin / foam-admin
