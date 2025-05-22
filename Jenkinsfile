pipeline {
  agent any

  environment {
    // Jenkins credentials: Secret Text credential named SONAR_TOKEN
    SONAR_TOKEN  = credentials('SONAR_TOKEN')
    // The SonarScanner tool you installed globally
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build App Docker Image') {
      steps {
        sh '''
          docker build --pull \
            -t devsecops_lab_app:latest \
            ./app
        '''
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('SonarQube Server') {
          sh "${SCANNER_HOME}/bin/sonar-scanner -Dsonar.login=$SONAR_TOKEN"
        }
      }
    }

    stage('Run App Container') {
      steps {
        sh '''
          # tear down any previous instance
          docker rm -f devsecops_app 2>/dev/null || true

          # start the app - map host port 9080 to container port 3009 (not 8080!)
          docker run -d \
            --name devsecops_app \
            -p 9080:3009 \
            devsecops_lab_app:latest
          
          # Wait for app to be ready - longer wait and better health check
          echo "Waiting for app to start..."
          sleep 15
          
          # Check if container is running
          docker ps | grep devsecops_app || echo "Container not running!"
          
          # Check container logs
          echo "Container logs:"
          docker logs devsecops_app
          
          # Test connectivity with timeout and retries
          for i in 1 2 3 4 5 6 7 8 9 10; do
            if curl -f --connect-timeout 5 http://localhost:9080; then
              echo "App is ready!"
              break
            else
              echo "Attempt $i: App not ready, waiting 5 more seconds..."
              sleep 5
            fi
          done
        '''
      }
    }

    stage('OWASP ZAP Full Scan') {
      steps {
        sh '''
          # Get VM IP address using hostname command
          VM_IP=$(hostname -I | awk '{print $1}')
          
          # Fallback to localhost if hostname fails
          if [ -z "$VM_IP" ]; then
            VM_IP="127.0.0.1"
          fi
          
          echo "Using VM IP: $VM_IP"
          
          # Test connectivity before ZAP scan
          if curl -f --connect-timeout 5 http://$VM_IP:9080; then
            echo "App is accessible at http://$VM_IP:9080"
          else
            echo "Cannot connect to app at http://$VM_IP:9080, trying localhost..."
            VM_IP="localhost"
          fi
          
          docker run --rm \
            --network host \
            -v $(pwd):/zap/wrk/:rw \
            zaproxy/zap-stable \
            zap-full-scan.py \
              -t http://${VM_IP}:9080 \
              -r zap_report.html
        '''
        archiveArtifacts artifacts: 'zap_report.html', fingerprint: true
      }
    }
  }

  post {
    always {
      sh '''
        # clean up the app container & dangling images
        docker stop devsecops_app  || true
        docker rm   devsecops_app  || true
        docker image prune -f
      '''
    }
  }
}