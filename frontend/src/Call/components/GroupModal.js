import React, { Component, useState, useEffect } from "react";
import { useGetGroupsQuery, useGetSystemsQuery, } from '../../features/api/apiSlice'
import { setGroupFilter, setCenterCall, setBackgroundAutoplay } from "../../features/callPlayer/callPlayerSlice";
import { useSelector, useDispatch } from 'react-redux'

import {
  Modal,
  Button,
  Icon,
  Dropdown,
  Grid,
  Form
} from "semantic-ui-react";
import "./FilterModal.css";

function GroupModal(props) {
  const shortName = useSelector((state) => state.callPlayer.shortName);
  const backgroundAutoplay = useSelector((state) => state.callPlayer.backgroundAutoplay);
  const centerCall = useSelector((state) => state.callPlayer.centerCall);
  const { data: groupData, isSuccess } = useGetGroupsQuery(props.shortName);
  const { data: allSystems } = useGetSystemsQuery();
  const [selectedGroup, setSelectedGroup] = useState(false);
  const [groupOptions, setGroupOptions] = useState([]);
  const [localCenterCall, setLocalCenterCall] = useState(centerCall);
  const [localBackgroundAutoplay, setLocalBackgroundAutoplay] = useState(backgroundAutoplay);
  const dispatch = useDispatch()
  const onClose = props.onClose;
  let system = false;


  if (allSystems) {
    system = allSystems.systems.find((system) => system.shortName === shortName)
  }

  function handleDone(onClose) {
    dispatch(setCenterCall(localCenterCall));
    dispatch(setBackgroundAutoplay(localBackgroundAutoplay));
    if (selectedGroup && (selectedGroup!="all")) {
      dispatch(setGroupFilter(selectedGroup))
      
      //dispatch({type: types.SET_GROUP_FILTER, groupId: selectedGroup  })
      onClose(true);
    } else {
      onClose(false);
    }
  }


  useEffect(() => {
    if (isSuccess) {
      let temp = [{
        key: "all",
        value: "all",
        text: "All Calls"
      }];
      for (const num in groupData) {
        const group = groupData[num];
        const obj = {
          key: group._id,
          value: group._id,
          text: group.groupName
        }
        temp.push(obj);
      }
      setGroupOptions(temp);
    }
  }, [groupData]);





  return (

    <Modal open={props.open} onClose={() => handleDone(onClose)} size='tiny'>

      <Modal.Header>{system && system.name}</Modal.Header>
      <Modal.Content >
        <Modal.Description>

          <Grid >
            <Grid.Row>
              <Grid.Column width={8}>
                {system && system.description}
              </Grid.Column>
              <Grid.Column width={8}>
                <p>Choose the type of calls you want to listen to</p>
                <Form>
                <Form.Select placeholder='All Calls' fluid selection options={groupOptions} name='selectedGroup' onChange={(e, data) => setSelectedGroup(data.value)} />
                <Form.Checkbox label='Focus on call playing' checked={localCenterCall} onChange={(e, data) => setLocalCenterCall(data.checked)} />
                <Form.Checkbox label='Background autoplay' checked={localBackgroundAutoplay} onChange={(e, data) => setLocalBackgroundAutoplay(data.checked)} />
                </Form>
              </Grid.Column>
            </Grid.Row>
          </Grid>

        </Modal.Description>

      </Modal.Content>
      <Modal.Actions>
        <Button onClick={() => handleDone(onClose)} >
          <Icon name='headphones' /> Listen
        </Button>
      </Modal.Actions>
    </Modal>

  )
}

export default GroupModal;
