import React from "react";
import {
  Header,
  Button,
  Divider,
  List,
  Segment,
  Statistic,
  Icon,
  Menu
} from "semantic-ui-react";

// ----------------------------------------------------
function CallInfo(props) {
    let srcList = "";
    let callLength = "-";
    let callFreq = "-";
    let callDate = "-";
    let callTime = "-";
    let talkgroupNum = "-";
    let callDownload = "";
    let callTweet = "";
    if (props.call) {
      const currentCall = props.call;
      var time = new Date(currentCall.time);
      callTime = time.toLocaleTimeString();
      callDate = time.toLocaleDateString();
      if (currentCall.freq) {
        var freq = currentCall.freq / 1000000;
        callFreq = Math.round(freq * 1000) / 1000;
      }

      srcList = currentCall.srcList.map((source, index) => <List.Item key={index}>{source.src}[{source.pos}]</List.Item>);
      callLength = currentCall.len;
      talkgroupNum = currentCall.talkgroupNum;
      callDownload = currentCall.url;
      callTweet = "https://twitter.com/intent/tweet?url="+encodeURIComponent(document.location.origin+props.link)+"&via="+encodeURIComponent("OpenMHz");
    }

    return (
      <div>
      <Segment padded attached>
        <Header as='h1'>{props.header}</Header>
        <List bulleted horizontal link>
          {srcList}
        </List>
        <Divider/>
        <Statistic size='small'>
          <Statistic.Label>Seconds</Statistic.Label>
          <Statistic.Value>{callLength}</Statistic.Value>
        </Statistic>
        <Statistic size='small'>
          <Statistic.Label>Talkgroup</Statistic.Label>
          <Statistic.Value>{talkgroupNum}</Statistic.Value>
        </Statistic>

        <List divided verticalAlign='middle'>
          <List.Item>
            <Icon name="wait"/>
            <List.Content>
              {callTime}
            </List.Content>
          </List.Item>
          <List.Item>
            <Icon name="calendar outline"/>
            <List.Content>
              {callDate}
            </List.Content>
          </List.Item>
          <List.Item>
            <Icon name="cubes"/>
            <List.Content>
              {callFreq} MHz
            </List.Content>
          </List.Item>
        </List>
      </Segment>
          <Menu attached='bottom'>
          <a href={callTweet}><Menu.Item name="tweet" ><Icon name='twitter' />Tweet</Menu.Item></a>
          <a href={callDownload}><Menu.Item name="download"><Icon name="download" />Download</Menu.Item></a>
          <a href={props.link}><Menu.Item name="link"><Icon name="at" />Link</Menu.Item></a>
        </Menu>
        </div>
    );
  }

  export default CallInfo;
