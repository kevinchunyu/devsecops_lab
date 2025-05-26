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
    REPORT_HTML  = "zap_baseline_report_${BUILD_ID}.html"
    REPORT_JSON  = "zap_baseline_report_${BUILD_ID}.json"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Node.js for Sonar') {
      steps {
        sh '''
          if ! command -v node > /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
          fi
        '''
      }
    }

    stage('SonarQube Static Analysis') {
      when {
        expression { return params.RUN_SONAR }
      }
      steps {
        withSonarQubeEnv('SonarQube Server') {
          sh '''
            ${SCANNER_HOME}/bin/sonar-scanner \
              -Dsonar.login=${SONAR_TOKEN} \
              -Dsonar.host.url=http://sonarqube:9000 \
              -Dsonar.projectKey=devsecops_lab_student001 \
              -Dsonar.projectName="DevSecOps Lab - student001" \
              -Dsonar.projectVersion=${BUILD_ID} \
              -Dsonar.sources=app \
              -Dsonar.exclusions=**/node_modules/** \
              -Dsonar.javascript.file.suffixes=.js \
              -Dsonar.sourceEncoding=UTF-8
          '''
        }
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
        sh '''
          docker network inspect ${DOCKER_NET} >/dev/null 2>&1 || docker network create ${DOCKER_NET}
          docker rm -f ${APP_NAME} || true
          docker run -d --name ${APP_NAME} --network ${DOCKER_NET} student_app:${IMAGE_TAG}

          for i in {1..20}; do
            if docker exec ${APP_NAME} curl -s http://localhost:3009/health | grep -q "healthy"; then
              echo "App is ready"
              break
            fi
            sleep 3
          done
        '''
      }
    }

    stage('Test SQL Injection') {
      steps {
        sh '''
          PAYLOADS=("admin'--" "admin' OR '1'='1" "' OR 'x'='x")
          
          for payload in "${PAYLOADS[@]}"; do
            RESPONSE=$(docker exec ${APP_NAME} curl -s -X POST http://localhost:3009/api/login \
              -H "Content-Type: application/json" \
              -d "{\"username\": \"$payload\", \"password\": \"test\"}")
            
            if [[ "$RESPONSE" == *"Login successful"* ]] || [[ "$RESPONSE" == *"welcome"* ]]; then
              echo "SQL Injection vulnerability detected!"
              exit 1
            fi
          done
          
          echo "SQL injection tests passed"
        '''
      }
    }

    stage('OWASP ZAP Scan') {
      steps {
        sh '''
          docker run --rm \
            --network ${DOCKER_NET} \
            --user 0:0 \
            -v $WORKSPACE:/zap/wrk/:rw \
            zaproxy/zap-stable \
            zap-baseline-scan.py \
              -t http://${APP_NAME}:3009 \
              -r ${REPORT_HTML} \
              -J ${REPORT_JSON} \
              -I
        '''
      }
    }
  }

  post {
    always {
      sh 'docker rm -f ${APP_NAME} || true'
      archiveArtifacts artifacts: 'zap_baseline_report_*.html,zap_baseline_report_*.json', allowEmptyArchive: true
    }
    failure {
      sh 'docker logs ${APP_NAME} || true'
    }
  }
}