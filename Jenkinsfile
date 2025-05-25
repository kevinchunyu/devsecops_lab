pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_SONAR', defaultValue: false, description: 'Run SonarQube Static Analysis?')
  }

  environment {
    SONAR_TOKEN  = credentials('SONAR_TOKEN')
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
    IMAGE_TAG    = "student001-${BUILD_ID}"
    APP_NAME     = "app_student001_${BUILD_ID}"
    DOCKER_NET   = "devsecops_net"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Docker Image') {
      steps {
        dir('app') {
          sh 'docker build -t student_app:${IMAGE_TAG} .'
        }
      }
    }

    stage('Run App Container') {
      steps {
        script {
          sh '''
            # Create shared Docker network if it doesn't exist
            docker network inspect ${DOCKER_NET} >/dev/null 2>&1 || docker network create ${DOCKER_NET}

            # Remove any existing app container
            docker rm -f ${APP_NAME} || true

            # Run app in shared Docker network
            docker run -d --name ${APP_NAME} --network ${DOCKER_NET} student_app:${IMAGE_TAG}

            echo "⏳ Waiting for container to be healthy..."
            sleep 5

            # Poll for health check
            for i in {1..20}; do
              if docker exec ${APP_NAME} curl -s http://localhost:3009/health | grep -q "healthy"; then
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
              zap-baseline.py \
                -t http://${APP_NAME}:3009 \
                -r zap_baseline_report_${BUILD_ID}.html \
                -J zap_baseline_report_${BUILD_ID}.json \
                -I
          '''
        }
      }
    }

    stage('SonarQube Static Analysis') {
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
              -Dsonar.scanner.forceReload=true
          '''
        }
      }
    }
  }

  post {
    always {
      script {
        // Stop and remove app container
        sh "docker rm -f ${APP_NAME} || true"

        // Archive ZAP reports
        archiveArtifacts artifacts: 'zap_baseline_report_*.html,zap_baseline_report_*.json', allowEmptyArchive: true

        echo "✅ Pipeline completed."
      }
    }

    failure {
      script {
        sh '''
          echo "❌ Pipeline failed. Logs from app container:"
          docker logs ${APP_NAME} || echo "Could not fetch logs"
        '''
        echo "❌ Check pipeline output for issues."
      }
    }
  }
}
