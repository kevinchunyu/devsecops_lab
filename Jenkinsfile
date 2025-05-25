pipeline {
  agent any
  
  parameters {
    string(
      name: 'STUDENT_REPO_URL',
      defaultValue: 'https://github.com/kevinchunyu/devsecops_lab.git',
      description: 'Student GitHub repository URL'
    )
    string(
      name: 'BRANCH_NAME',
      defaultValue: 'main',
      description: 'Branch to test'
    )
    string(
      name: 'STUDENT_ID',
      defaultValue: 'student001',
      description: 'Student identifier'
    )
  }
  
  tools {
    nodejs 'Node 18'
  }
  
  environment {
    SONAR_TOKEN = credentials('SONAR_TOKEN')
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
    APP_NAME = "test_app_${params.STUDENT_ID}_${BUILD_NUMBER}"
    IMAGE_TAG = "student_app:${params.STUDENT_ID}-${BUILD_NUMBER}"
    TEST_PORT = "${9100 + (BUILD_NUMBER % 50)}"
  }
  
  stages {
    stage('Checkout') {
      steps {
        git branch: "${params.BRANCH_NAME}", url: "${params.STUDENT_REPO_URL}"
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('SonarQube Server') {
          sh '''
            ${SCANNER_HOME}/bin/sonar-scanner \
              -Dsonar.login=$SONAR_TOKEN \
              -Dsonar.projectKey=devsecops_lab_${STUDENT_ID} \
              -Dsonar.projectName="DevSecOps Lab - ${STUDENT_ID}" \
              -Dsonar.projectVersion=${BUILD_NUMBER} \
              -Dsonar.sources=app \
              -Dsonar.exclusions="**/node_modules/**" \
              -Dsonar.javascript.file.suffixes=.js \
              -Dsonar.sourceEncoding=UTF-8
          '''
        }
      }
    }

    stage('Build App') {
      steps {
        sh '''
          docker build -t ${IMAGE_TAG} ./app
        '''
      }
    }

    stage('Run App') {
      steps {
        sh '''
          docker rm -f ${APP_NAME} 2>/dev/null || true
          
          docker run -d \
            --name ${APP_NAME} \
            -p ${TEST_PORT}:3009 \
            ${IMAGE_TAG}
          
          sleep 15
          
          if ! docker ps | grep -q ${APP_NAME}; then
            echo "Container failed to start"
            docker logs ${APP_NAME}
            exit 1
          fi
        '''
      }
    }

    stage('OWASP ZAP Baseline Scan') {
      steps {
        sh '''
          TARGET_URL="http://localhost:${TEST_PORT}"
          
          docker run --rm \
            --network host \
            -v ${WORKSPACE}:/zap/wrk/:rw \
            zaproxy/zap-stable zap-baseline.py \
              -t ${TARGET_URL} \
              -r zap_baseline_report.html \
              -J zap_baseline_report.json
        '''
      }
    }
  }

  post {
    always {
      sh '''
        docker stop ${APP_NAME} 2>/dev/null || true
        docker rm ${APP_NAME} 2>/dev/null || true
        docker rmi ${IMAGE_TAG} 2>/dev/null || true
      '''
      
      archiveArtifacts artifacts: 'zap_baseline_report.*', allowEmptyArchive: true
    }
  }
}