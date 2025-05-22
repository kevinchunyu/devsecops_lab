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

          # start the app on host port 9080 mapping to container 8080
          docker run -d \
            --name devsecops_app \
            -p 9080:8080 \
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
          for i in {1..10}; do
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
          # Try multiple methods to get IP address
          VM_IP=""
          
          # Method 1: Try hostname -I
          if command -v hostname >/dev/null 2>&1; then
            VM_IP=$(hostname -I | awk '{print $1}')
          fi
          
          # Method 2: Try parsing /proc/net/route if hostname failed
          if [ -z "$VM_IP" ]; then
            VM_IP=$(awk '/^[^0-9]/ { next } /^0/ { print $2 }' /proc/net/route | head -1 | xargs printf "%d.%d.%d.%d\n" $(echo $((0x$(echo {} | cut -c7-8))) $(echo $((0x$(echo {} | cut -c5-6))) $(echo $((0x$(echo {} | cut -c3-4))) $(echo $((0x$(echo {} | cut -c1-2)))))
          fi
          
          # Method 3: Fallback to common VM IPs
          if [ -z "$VM_IP" ]; then
            # Try common private network ranges
            for test_ip in "10.0.0.4" "192.168.1.4" "172.16.0.4" "127.0.0.1"; do
              if curl -f --connect-timeout 2 http://$test_ip:9080 >/dev/null 2>&1; then
                VM_IP=$test_ip
                break
              fi
            done
          fi
          
          # Final fallback - use localhost and hope for the best
          if [ -z "$VM_IP" ]; then
            VM_IP="127.0.0.1"
          fi
          
          echo "Using VM IP: $VM_IP"
          
          # Test connectivity before ZAP scan
          curl -f --connect-timeout 5 http://$VM_IP:9080 || {
            echo "Cannot connect to app at http://$VM_IP:9080"
            echo "Trying direct localhost..."
            VM_IP="localhost"
          }
          
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