pipeline {
  agent any

  environment {
    SONAR_TOKEN  = credentials('SONAR_TOKEN')
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
    IMAGE_TAG    = "student001-${BUILD_ID}"
    APP_NAME     = "app_student001_${BUILD_ID}"
    DOCKER_NET   = "devsecops-net"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build App Docker Image') {
      steps {
        sh 'docker build -t student_app:${IMAGE_TAG} ./app'
      }
    }

    stage('Run App in Shared Network') {
      steps {
        script {
          sh '''
            docker network inspect ${DOCKER_NET} >/dev/null 2>&1 || docker network create ${DOCKER_NET}
            docker rm -f ${APP_NAME} || true
            docker run -d --name ${APP_NAME} --network ${DOCKER_NET} student_app:${IMAGE_TAG}

            echo "⏳ Waiting for container to be healthy..."
            sleep 5

            for i in {1..20}; do
              if curl -s --connect-timeout 5 --max-time 10 http://${APP_NAME}:3009/health | grep -q "healthy"; then
                echo "✅ App is healthy!"
                break
              fi
              echo "⏳ Attempt $i: not healthy yet..."
              sleep 3
            done
          '''
        }
      }
    }

    stage('OWASP ZAP Baseline Scan') {
      steps {
        script {
          sh '''
            echo "🕷️ Starting OWASP ZAP Baseline Scan..."
            chmod -R 777 $WORKSPACE

            docker run --rm \
              --network ${DOCKER_NET} \
              --user 0:0 \
              -v $WORKSPACE:/zap/wrk/:rw \
              zaproxy/zap-stable \
              zap-baseline.py -t http://${APP_NAME}:3009 \
              -r zap_baseline_report.html \
              -J zap_baseline_report.json \
              -I
          '''
        }
      }
    }

    stage('SonarQube Analysis') {
      when {
        expression { return params.RUN_SONAR ?: false }
      }
      steps {
        withSonarQubeEnv('SonarQube Server') {
          sh '''
            ${SCANNER_HOME}/bin/sonar-scanner \
              -Dsonar.login=${SONAR_TOKEN} \
              -Dsonar.projectKey=devsecops_lab_student001 \
              -Dsonar.projectName="DevSecOps Lab - student001" \
              -Dsonar.projectVersion=${BUILD_ID} \
              -Dsonar.sources=app \
              -Dsonar.exclusions=**/node_modules/** \
              -Dsonar.javascript.file.suffixes=.js \
              -Dsonar.sourceEncoding=UTF-8 \
              -Dsonar.javascript.node.maxspace=4096
          '''
        }
      }
    }
  }

  post {
    always {
      script {
        sh "docker rm -f ${APP_NAME} || true"
        archiveArtifacts artifacts: '*.html,*.json', allowEmptyArchive: true
        echo "✅ Pipeline completed."
      }
    }
    failure {
      script {
        sh '''
          echo "❌ Pipeline failed. Container logs below:"
          docker logs ${APP_NAME} || echo "Could not get logs"
        '''
        echo "❌ Pipeline failed."
      }
    }
  }
}
