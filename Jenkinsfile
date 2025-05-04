pipeline {
  agent any

  environment {
    APP_URL = "http://app:3000"
  }

  stages {
    stage('Build') {
      steps {
        sh 'docker build -t userapp .'
      }
    }

    stage('Run App Container') {
      steps {
        sh 'docker run -d --name myapp-test -p 3000:3000 userapp'
        sleep(time: 5, unit: 'SECONDS')
      }
    }

    stage('ZAP Scan') {
    steps {
        sh '''
        docker run --rm --network devsecops_devnet \
            zaproxy/zap-stable zap-baseline.py \
            -t ${APP_URL} -r zap-report.html -I -s Medium
        '''
    }
    }


    stage('Publish Report') {
      steps {
        publishHTML target: [
          reportName : 'ZAP Security Report',
          reportDir  : '.',
          reportFiles: 'zap-report.html',
          keepAll    : true
        ]
      }
    }

    stage('Cleanup') {
      steps {
        sh 'docker rm -f myapp-test || true'
      }
    }
  }
}
